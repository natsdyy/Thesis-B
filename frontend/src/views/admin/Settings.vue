<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        System Settings
      </h1>
      <p class="text-base-content/70">
        Configure system preferences and settings
      </p>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">General Settings</h2>
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Company Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              value="Countryside Steak House"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">System Theme</span>
            </label>
            <select class="select select-bordered">
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <span class="label-text">Enable Email Notifications</span>
              <input type="checkbox" class="checkbox" checked />
            </label>
          </div>
        </div>

        <div class="card-actions justify-end mt-6">
          <button class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none">Save Settings</button>
        </div>
      </div>
    </div>
  </div>
</template>
