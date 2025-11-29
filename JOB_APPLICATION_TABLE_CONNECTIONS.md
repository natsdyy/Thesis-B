# Job Application Table Connections

This document outlines how the job application related tables are connected in the database.

## Table Relationships

### 1. **job_applications** Table
- **Primary Key**: `id` (auto-increment integer)
- **Connection to Positions**:
  - `position_id` (nullable integer) → Can reference either:
    - `branch_positions.id` (for branch-specific positions)
    - `user_roles.role_id` (for department roles)
- **Other Fields**:
  - `full_name`, `email`, `phone`, `date_of_birth`, `address`
  - `position_title`, `department` (stored as strings, not foreign keys)
  - `experience_years`, `expected_salary`, `skills`
  - `motivation`, `availability`, `additional_notes` (nullable)
  - `resume_path`, `additional_documents_path` (nullable)
  - `application_date`, `status` (enum: 'new', 'reviewing', 'interview-scheduled', 'rejected', 'hired')
  - `created_at`, `updated_at`

**Indexes**:
- `status`
- `department`
- `position_id`
- `application_date`
- `email`

---

### 2. **job_interviews** Table
- **Primary Key**: `id` (auto-increment integer)
- **Foreign Key**:
  - `application_id` (NOT NULL integer) → `job_applications.id`
    - **Constraint**: `ON DELETE CASCADE` (if application is deleted, interviews are deleted too)
- **Other Fields**:
  - `interview_date`, `interview_time`
  - `interview_type` (enum: 'in-person', 'video', 'phone')
  - `duration` (integer, minutes) - default 30
  - `location`, `meeting_link`, `notes` (nullable)
  - `status` (enum: 'scheduled', 'completed', 'cancelled', 'rescheduled')
  - `result` (nullable string: 'passed', 'failed') - added in migration `20250131000003_add_result_to_job_interviews.js`
  - `created_at`, `updated_at`

**Indexes**:
- `application_id`
- `interview_date`
- `status`
- `interviewer_email` (removed in migration `20250130000003_remove_interviewer_fields_from_job_interviews.js`)

**Relationship**: One-to-Many (One job application can have multiple interviews)

---

### 3. **branch_positions** Table
- **Primary Key**: `id` (auto-increment integer)
- **Foreign Key**:
  - `branch_id` (NOT NULL integer) → `branches.id`
    - **Constraint**: `ON DELETE CASCADE` (if branch is deleted, positions are deleted too)
- **Other Fields**:
  - `position_title`, `position_code` (unique within branch)
  - `description`, `requirements` (nullable)
  - `rate_per_hour`, `hours_per_month`, `monthly_salary`
  - `total_slots`, `filled_slots`
  - `status` (enum: 'open', 'filled', 'on-hold', 'closed')
  - `job_status` (enum: 'open', 'closed', 'filled', 'on-hold') - added in migration `20250131000002_add_job_status_to_branch_positions.js`
  - `department` (enum: 'Human Resource', 'Finance', 'SCM', 'Production', 'CRM', 'Branch')
  - `position_type` (enum: 'Full-time', 'Part-time', 'Contract', 'Intern')
  - `is_active` (boolean)
  - `created_at`, `updated_at`, `deleted_at` (nullable)

**Unique Constraint**: `[branch_id, position_code]` - Position codes must be unique within each branch

**Indexes**:
- `branch_id`
- `position_code`
- `status`
- `department`
- `is_active`

**Connection to job_applications**: 
- Referenced via `job_applications.position_id` when the application is for a branch-specific position

---

### 4. **user_roles** Table (Department Roles)
- **Primary Key**: `role_id` (auto-increment integer)
- **Fields**:
  - `role` (string) - e.g., "Manager", "Staff"
  - `department` (string) - e.g., "Human Resource", "Finance", "SCM", etc.
  - `description`, `rate_per_hour`
  - `is_active` (boolean)
  - `created_at`, `updated_at`, `deleted_at` (nullable)

**Connection to job_applications**: 
- Referenced via `job_applications.position_id` when the application is for a department role
- Accessed via `/api/roles/positions` endpoint
- Used in frontend through `usePositionsStore`

---

### 5. **branches** Table
- **Primary Key**: `id` (auto-increment integer)
- **Connected Tables**:
  - `branch_positions` → via `branch_positions.branch_id`
  - Indirectly connected to `job_applications` through `branch_positions`

---

## Data Flow

### When Creating a Job Application:
1. User selects a position from either:
   - **Branch Positions**: `/api/branch-positions` (stored in `branch_positions` table)
   - **Department Roles**: `/api/roles/positions` (stored in `user_roles` table)
2. `job_applications.position_id` is set to:
   - `branch_positions.id` (for branch positions)
   - `user_roles.role_id` (for department roles)
3. `job_applications.position_title` and `job_applications.department` are stored as strings (denormalized for display)

### When Scheduling an Interview:
1. Interview is created with `job_interviews.application_id` → `job_applications.id`
2. Application status is updated to `'interview-scheduled'`
3. Interview can be linked back to application using `application_id` foreign key

### When Fetching Applications with Interviews:
- `Interview.getAll()` uses `leftJoin` to include application data:
  ```sql
  SELECT job_interviews.*, 
         job_applications.full_name as applicant_name,
         job_applications.position_title,
         job_applications.department
  FROM job_interviews
  LEFT JOIN job_applications ON job_interviews.application_id = job_applications.id
  ```

---

## API Endpoints Summary

### Job Applications:
- `POST /api/job-applications` - Create application
- `GET /api/job-applications` - Get all applications
- `GET /api/job-applications/:id` - Get specific application
- `PUT /api/job-applications/:id/status` - Update status
- `DELETE /api/job-applications/:id` - Delete application

### Interviews:
- `POST /api/job-applications/interviews` - Schedule interview
- `GET /api/job-applications/interviews` - Get all interviews
- `GET /api/job-applications/interviews/:id` - Get specific interview
- `PUT /api/job-applications/interviews/:id/status` - Update interview status
- `DELETE /api/job-applications/interviews/:id` - Delete interview

### Positions:
- `GET /api/branch-positions` - Get branch positions
- `GET /api/roles/positions` - Get department roles/positions

---

## Key Notes:

1. **Flexible Position Reference**: `job_applications.position_id` can reference either `branch_positions.id` or `user_roles.role_id`, depending on whether the position is branch-specific or department-based.

2. **Cascade Deletes**: 
   - Deleting a job application will cascade delete all related interviews
   - Deleting a branch will cascade delete all related branch positions

3. **Status Enums**:
   - Application status: 'new', 'reviewing', 'interview-scheduled', 'rejected', 'hired'
   - Interview status: 'scheduled', 'completed', 'cancelled', 'rescheduled'
   - Position status: 'open', 'filled', 'on-hold', 'closed'

4. **Denormalized Data**: `position_title` and `department` are stored directly in `job_applications` table for quick access, even though they could be fetched via joins.


