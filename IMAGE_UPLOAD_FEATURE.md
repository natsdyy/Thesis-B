# Image Upload Feature for Countryside Steakhouse Feedback System

## Overview

I've successfully added image upload functionality to your feedback system! Now customers can share pictures of their food experiences directly through the contact form, and these images will be automatically sent to your Telegram group along with their feedback.

## ✨ What's New

### 🖼️ Image Upload in Contact Form
- **Required image upload** - Customers must include a photo of their food experience
- **Drag & drop support** - Easy file selection
- **Image preview** - Shows thumbnail before submission
- **File validation** - Only accepts image files (JPG, PNG, GIF)
- **Size limit** - Maximum 5MB per image
- **Automatic cleanup** - Images are deleted after sending to Telegram

### 📱 Enhanced Telegram Integration
- **Image + caption** - Sends image with formatted feedback message
- **Fallback support** - Still works without images
- **Better formatting** - Indicates when an image is attached

## 🚀 How It Works

### 1. Customer Experience
1. Customer fills out the feedback form
2. **REQUIRED**: They must upload an image of their food experience
3. Image preview shows what they're uploading
4. Form submits both feedback and image
5. Success message confirms submission

### 2. Backend Processing
1. Receives multipart form data (text + image)
2. Validates image file type and size
3. Temporarily stores image in uploads folder
4. Sends image + caption to Telegram group
5. Cleans up uploaded file automatically

### 3. Telegram Delivery
1. Bot receives the feedback data
2. Always sends photo with caption (image is required)
3. Message includes all feedback details + image indicator

## 🛠️ Technical Implementation

### Backend Changes
- **New dependency**: `multer` for file upload handling
- **Updated route**: `/api/feedback` now accepts multipart/form-data
- **File validation**: Type checking, size limits, and required field validation
- **Automatic cleanup**: Removes uploaded files after processing
- **Error handling**: Graceful fallback if image upload fails

### Frontend Changes
- **Enhanced form**: Added image upload field with preview
- **FormData handling**: Uses FormData for multipart submissions
- **User experience**: Drag & drop, preview, remove functionality
- **Validation**: Client-side file type and size validation

### File Structure
```
backend/
├── routes/feedback.js          # Updated with image handling
├── uploads/feedback-images/    # Temporary image storage
└── scripts/test-image-upload.js # Test script for image functionality

frontend/src/crm/
└── homepage.vue               # Enhanced contact form with image upload
```

## 📋 Setup Requirements

### 1. Install Dependencies
```bash
cd backend
npm install multer
```

### 2. Environment Variables
Ensure these are set in your `.env` file:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=@PNCountryside_Feedbacks
```

### 3. Bot Permissions
Your Telegram bot needs permission to:
- ✅ Send messages
- ✅ Send photos
- ✅ Send media group messages

## 🧪 Testing

### 1. Test Image Upload Functionality
```bash
cd backend
npm run test:image-upload
```

### 2. Test on Website
1. Go to your website's contact form
2. Fill out the form with an image (required)
3. Submit and check Telegram group
4. Verify image appears with caption

### 3. Test Validation
1. Try to submit feedback without image
2. Verify error message appears
3. Check that form won't submit without image

## 📱 Telegram Message Format

### With Image
```
🆕 New Customer Feedback

👤 Name: John Doe
📧 Email: john@example.com
📱 Phone: +1234567890
⭐ Rating: ⭐⭐⭐⭐⭐
📸 Image: Attached
💬 Message:

The steak was amazing! Perfect medium-rare.

📅 Submitted: December 15, 2024 at 2:30 PM
🌐 Source: Website Contact Form
```

### All Feedback Now Includes Images
Since images are now required, all feedback will be sent with photos. The system will not accept feedback submissions without images.

## 🔧 Configuration Options

### File Size Limits
- **Current**: 5MB maximum
- **Change**: Modify `fileSize` in `multer` configuration

### Accepted Formats
- **Current**: JPG, PNG, GIF
- **Change**: Modify `fileFilter` function

### Storage Location
- **Current**: `backend/uploads/feedback-images/`
- **Change**: Modify `destination` in storage configuration

## 🚨 Security Features

### File Validation
- ✅ Only image files accepted
- ✅ File size limits enforced
- ✅ File type checking
- ✅ Automatic cleanup after processing

### Input Sanitization
- ✅ File name sanitization
- ✅ Path traversal prevention
- ✅ Temporary storage only

## 📊 Monitoring & Debugging

### Logs to Watch
```bash
# Backend logs
tail -f backend_stdout.log
tail -f backend_stderr.log

# Look for these messages:
# "Feedback with image sent to Telegram successfully"
# "Uploaded image cleaned up"
# "Failed to send feedback to Telegram"
```

### Health Check
```bash
GET /api/feedback/health
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Image Not Uploading
- Check file size (must be < 5MB)
- Verify file type (must be image)
- Check browser console for errors
- Verify form submission method

#### 2. Telegram Not Receiving Images
- Check bot permissions
- Verify bot token
- Check chat ID format
- Review backend logs

#### 3. File Cleanup Issues
- Check uploads folder permissions
- Verify file paths
- Check disk space

### Debug Steps
1. Run test script: `npm run test:image-upload`
2. Check backend logs
3. Verify environment variables
4. Test bot permissions manually

## 🔮 Future Enhancements

### Possible Additions
1. **Multiple images** - Allow multiple photo uploads
2. **Image compression** - Optimize large images
3. **Cloud storage** - Store images in cloud instead of local
4. **Image moderation** - Content filtering
5. **Thumbnail generation** - Create smaller previews
6. **Database storage** - Store image metadata

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run the test scripts
3. Review backend logs
4. Verify Telegram bot configuration

## 🎯 Benefits

### For Customers
- **Visual feedback** - Show exactly what they experienced
- **Better communication** - Pictures speak louder than words
- **Easy sharing** - Simple drag & drop interface

### For Business
- **Visual insights** - See actual food presentation
- **Better feedback** - More detailed customer experiences
- **Social proof** - Real customer photos for marketing
- **Quality monitoring** - Visual feedback on food quality

### For Staff
- **Immediate visibility** - See feedback with context
- **Better responses** - Understand issues with visual evidence
- **Quality tracking** - Monitor food presentation over time

---

**🎉 Your feedback system now supports image uploads! Customers can share their food experiences visually, giving you better insights into their dining experience.**
