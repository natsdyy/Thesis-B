<template>
  <dialog ref="modal" class="modal">
    <div
      class="modal-box max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col"
    >
      <div
        class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0"
      >
        <div class="flex items-center gap-3">
          <!-- Mobile Preview Toggle Button -->
          <button
            type="button"
            @click="showPreviewMobile = !showPreviewMobile"
            class="lg:hidden btn btn-sm btn-ghost flex items-center gap-1"
            style="color: var(--color-primaryColor)"
          >
            <Eye v-if="!showPreviewMobile" :size="18" />
            <EyeOff v-else :size="18" />
            <span>Preview</span>
          </button>
          <h3 class="font-bold text-xl text-gray-900">
            {{ isEditing ? 'Edit Announcement' : 'Create New Announcement' }}
          </h3>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-circle btn-ghost"
          @click="closeModal"
        >
          <X :size="20" />
        </button>
      </div>

      <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        <!-- Form Section (Left) -->
        <div class="overflow-y-auto pr-2 relative">
          <form @submit.prevent="handleSubmit" class="flex flex-col gap-6">
            <!-- Announcement Type and Content Format -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold"
                    >Announcement Type *</span
                  >
                </label>
                <select
                  v-model="formData.announcement_type"
                  class="select select-bordered w-full"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="promotional">Promotional Announcement</option>
                  <option value="new_feature">New Feature Announcement</option>
                  <option value="event">Event Announcement</option>
                  <option value="job_hiring">Job Hiring Announcement</option>
                  <option value="simple_text">Simple Text Announcement</option>
                  <option value="promotional_banner">
                    Promotional Banner Style
                  </option>
                </select>
              </div>

              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold">Content Format *</span>
                </label>
                <select
                  v-model="formData.content_format"
                  class="select select-bordered w-full"
                  required
                  @change="onFormatChange"
                >
                  <option value="">Select format...</option>
                  <option value="all">Text, Image and Video</option>
                  <option value="text_image">Text and Image</option>
                  <option value="video_text">Video and Text</option>
                  <option value="text_only">Text Only</option>
                  <option value="image_only">Image Only</option>
                  <option value="video_only">Video Only</option>
                </select>
              </div>
            </div>

            <!-- Basic Info -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold">Title *</span>
                </label>
                <input
                  v-model="formData.title"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Enter announcement title"
                  required
                />
              </div>

              <div class="form-control w-full min-w-0" v-if="showSubtitle">
                <label class="label">
                  <span class="label-text font-semibold">Subtitle</span>
                </label>
                <input
                  v-model="formData.subtitle"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Enter subtitle (optional)"
                />
              </div>
            </div>

            <!-- Description (shown for text-based formats) -->
            <div class="form-control" v-if="showDescription">
              <label class="label">
                <div class="flex items-center justify-between w-full">
                  <div>
                    <span class="label-text font-semibold"
                      >Description {{ textRequired ? '*' : '' }}</span
                    >
                  </div>
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click="moveContentUp('description')"
                      :disabled="isFirstContent('description')"
                      title="Move up"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronUp :size="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click="moveContentDown('description')"
                      :disabled="isLastContent('description')"
                      title="Move down"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronDown :size="16" />
                    </button>
                  </div>
                </div>
              </label>
              <div class="border border-gray-300 rounded-lg overflow-hidden">
                <TinyMCEEditor
                  v-model="formData.description"
                  :init="tinyMCEConfig"
                  :disabled="false"
                />
              </div>
            </div>

            <!-- Images (shown for image-based formats) -->
            <div class="form-control" v-if="showImage">
              <div class="flex items-center justify-between mb-2">
                <label class="label py-0">
                  <div class="flex items-center gap-2">
                    <span class="label-text font-semibold"
                      >Images {{ imageRequired ? '*' : '' }}</span
                    >
                    <span class="label-text-alt text-gray-500"
                      >Enter URL or upload file</span
                    >
                  </div>
                </label>
                <div class="flex gap-2 items-center">
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click="moveContentUp('images')"
                      :disabled="isFirstContent('images')"
                      title="Move up"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronUp :size="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click="moveContentDown('images')"
                      :disabled="isLastContent('images')"
                      title="Move down"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronDown :size="16" />
                    </button>
                  </div>
                  <select
                    v-model="formData.image_display_type"
                    class="select select-bordered select-sm"
                    style="border-color: var(--color-primaryColor)"
                  >
                    <option value="single">Single Image</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
              </div>

              <!-- Image List -->
              <div class="space-y-2">
                <div
                  v-for="(image, index) in imageList"
                  :key="index"
                  class="flex gap-2 items-start"
                >
                  <div class="flex gap-2 flex-1">
                    <input
                      v-model="imageList[index]"
                      type="text"
                      class="input input-bordered flex-1"
                      :placeholder="`Image ${index + 1} URL or click Browse`"
                      :required="imageRequired && index === 0"
                    />
                    <input
                      :ref="
                        (el) => {
                          if (el) imageFileInputs[index] = el;
                        }
                      "
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="(e) => handleImageFileSelect(e, index)"
                    />
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      @click="imageFileInputs[index]?.click()"
                      :disabled="uploadingImages[index]"
                      style="
                        border-color: var(--color-primaryColor);
                        color: var(--color-primaryColor);
                      "
                    >
                      <span
                        v-if="uploadingImages[index]"
                        class="loading loading-spinner loading-xs"
                      ></span>
                      <template v-else>
                        <FolderOpen
                          :size="14"
                          style="color: var(--color-primaryColor)"
                        />
                      </template>
                    </button>
                    <button
                      v-if="imageList.length > 1"
                      type="button"
                      class="btn btn-ghost btn-sm text-error"
                      @click="removeImage(index)"
                      title="Remove image"
                    >
                      <X :size="14" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Add Image Button -->
              <button
                type="button"
                class="btn btn-outline btn-sm mt-2 w-full"
                @click="addImageField"
                style="
                  border-color: var(--color-primaryColor);
                  color: var(--color-primaryColor);
                "
              >
                <Plus :size="16" />
                <span>Add Another Image</span>
              </button>

              <!-- Image Previews -->
              <div
                v-if="imageList.some((img) => img)"
                class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                <div
                  v-for="(image, index) in imageList.filter((img) => img)"
                  :key="index"
                  class="relative group"
                >
                  <img
                    :src="image"
                    :alt="`Preview ${index + 1}`"
                    class="w-full h-24 object-cover rounded-lg border border-gray-200"
                    @error="handleImageError"
                  />
                  <button
                    v-if="imageList.length > 1"
                    type="button"
                    class="absolute top-1 right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="removeImage(imageList.indexOf(image))"
                  >
                    <X :size="12" />
                  </button>
                </div>
              </div>

              <label class="label" v-if="imageUploadError">
                <span class="label-text-alt text-error">{{
                  imageUploadError
                }}</span>
              </label>
            </div>

            <!-- Video URL (shown for video-based formats) -->
            <div class="form-control" v-if="showVideo">
              <label class="label">
                <div class="flex items-center gap-2">
                  <span class="label-text font-semibold"
                    >Video {{ videoRequired ? '*' : '' }}</span
                  >
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click.stop="moveContentUp('video')"
                      :disabled="isFirstContent('video')"
                      title="Move up"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronUp :size="16" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost btn-circle"
                      @click.stop="moveContentDown('video')"
                      :disabled="isLastContent('video')"
                      title="Move down"
                      style="color: var(--color-primaryColor)"
                    >
                      <ChevronDown :size="16" />
                    </button>
                  </div>
                </div>
              </label>
              <div class="flex gap-2">
                <input
                  v-model="formData.video_url"
                  type="text"
                  class="input input-bordered flex-1"
                  placeholder="Enter video URL (YouTube/Vimeo) or click Browse to upload"
                  :required="videoRequired && !videoFile"
                />
                <input
                  ref="videoFileInput"
                  type="file"
                  accept="video/*"
                  class="hidden"
                  @change="handleVideoFileSelect"
                />
                <button
                  type="button"
                  class="btn btn-outline"
                  @click="videoFileInput?.click()"
                  :disabled="uploadingVideo"
                  style="
                    border-color: var(--color-primaryColor);
                    color: var(--color-primaryColor);
                  "
                >
                  <span
                    v-if="uploadingVideo"
                    class="loading loading-spinner loading-sm"
                  ></span>
                  <template v-else>
                    <FolderOpen
                      :size="16"
                      style="color: var(--color-primaryColor)"
                    />
                    <span>Browse</span>
                  </template>
                </button>
              </div>
              <label class="label" v-if="videoFile">
                <span
                  class="label-text-alt flex items-center gap-1"
                  style="color: var(--color-primaryColor)"
                >
                  <Paperclip :size="14" />
                  <span
                    >Selected: {{ videoFile.name }} ({{
                      formatFileSize(videoFile.size)
                    }})</span
                  >
                </span>
              </label>
              <label class="label">
                <span
                  class="label-text-alt flex items-center gap-1"
                  style="color: var(--color-primaryColor)"
                >
                  <Lightbulb :size="14" />
                  <span
                    >Supported: YouTube, Vimeo, or direct video file uploads
                    (MP4, WEBM, OGG, MOV)</span
                  >
                </span>
              </label>
              <label class="label" v-if="videoUploadError">
                <span class="label-text-alt text-error">{{
                  videoUploadError
                }}</span>
              </label>
            </div>

            <!-- Promotion Details (shown for promotional types) -->
            <div class="form-control" v-if="showPromoDetails">
              <div class="flex items-center justify-between mb-2">
                <label class="label py-0">
                  <span class="label-text font-semibold"
                    >Promotion Details</span
                  >
                </label>
                <select
                  v-model="formData.promo_position"
                  class="select select-bordered select-sm"
                  style="border-color: var(--color-primaryColor)"
                >
                  <option value="below">Show Below</option>
                  <option value="above">Show Above</option>
                </select>
              </div>
              <div class="mt-2">
                <textarea
                  v-model="formData.promo_details"
                  class="textarea textarea-bordered min-h-[4rem]"
                  placeholder="Enter promotion details (optional)"
                ></textarea>
              </div>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold">Valid From *</span>
                </label>
                <input
                  v-model="formData.valid_from"
                  type="datetime-local"
                  class="input input-bordered w-full"
                  required
                />
              </div>

              <div class="form-control w-full min-w-0">
                <label class="label">
                  <div class="flex items-center justify-between w-full">
                    <span class="label-text font-semibold">Valid Until</span>
                    <div class="flex items-center gap-2">
                      <span class="label-text text-xs">Never Expires</span>
                      <input
                        type="checkbox"
                        class="toggle toggle-success toggle-sm"
                        v-model="isNonExpiry"
                        @change="onNonExpiryChange"
                        style="
                          --tglbg: var(--color-primaryColor-light);
                          --handle-bg: var(--color-primaryColor);
                        "
                      />
                    </div>
                  </div>
                </label>
                <input
                  v-model="formData.valid_until"
                  type="datetime-local"
                  class="input input-bordered w-full"
                  :disabled="isNonExpiry"
                  :placeholder="
                    isNonExpiry ? 'Never expires' : 'Select expiry date'
                  "
                />
              </div>
            </div>

            <!-- Action Button (optional) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full">
              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold">Action Link</span>
                </label>
                <input
                  v-model="formData.action_link"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Enter action link URL (optional)"
                />
              </div>

              <div class="form-control w-full min-w-0">
                <label class="label">
                  <span class="label-text font-semibold">Action Text</span>
                </label>
                <input
                  v-model="formData.action_text"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Enter action button text (optional)"
                />
              </div>
            </div>

            <!-- Display Settings -->
            <div class="form-control">
              <label class="label cursor-pointer">
                <div class="flex flex-col">
                  <span class="label-text font-semibold">Active</span>
                  <span
                    class="label-text-alt text-xs mt-0.5"
                    :class="
                      formData.is_active ? 'text-green-600' : 'text-gray-500'
                    "
                  >
      
                  </span>
                </div>
                <input
                  v-model="formData.is_active"
                  type="checkbox"
                  class="toggle"
                  :class="
                    formData.is_active ? 'toggle-success' : 'toggle-inactive'
                  "
                  :style="
                    formData.is_active
                      ? '--tglbg: var(--color-primaryColor-light); --handle-bg: var(--color-primaryColor);'
                      : '--tglbg: #d1d5db; --handle-bg: #9ca3af;'
                  "
                />
              </label>
            </div>

            <div
              class="modal-action sticky bottom-0 bg-white pt-4 border-t border-gray-200"
            >
              <button
                type="button"
                class="btn btn-ghost"
                @click="closeModal"
                :disabled="saving"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn text-white font-thin"
                style="
                  background-color: var(--color-primaryColor);
                  border-color: var(--color-primaryColor);
                "
                :disabled="saving"
              >
                <span
                  v-if="saving"
                  class="loading loading-spinner loading-sm"
                ></span>
                <span v-else>{{ isEditing ? 'Update' : 'Create' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Preview Section (Right) -->
        <div
          class="border-l-0 lg:border-l border-gray-200 pl-0 lg:pl-4 pt-4 lg:pt-0 overflow-y-auto lg:block"
          :class="showPreviewMobile ? 'block' : 'hidden'"
        >
          <div
            class="sticky top-0 bg-white pb-2 mb-4 border-b border-gray-200 z-10"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-bold text-lg text-gray-900">Preview</h4>
                <p class="text-xs text-gray-500">
                  See how your announcement will appear
                </p>
              </div>
              <button
                type="button"
                @click="showPreviewMobile = false"
                class="lg:hidden btn btn-sm btn-circle btn-ghost"
                title="Close Preview"
              >
                <X :size="18" />
              </button>
            </div>
          </div>

          <div
            class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
          >
            <!-- Preview Header -->
            <div
              class="text-white px-4 py-3 rounded-t-xl"
              style="
                background: linear-gradient(
                  to right,
                  var(--color-primaryColor),
                  var(--color-primaryColor)
                );
              "
            >
              <div class="flex items-center space-x-2">
                <div
                  class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H8a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                </div>
                <h2 class="text-base font-bold truncate">
                  {{ formData.title || 'Announcement Title' }}
                </h2>
              </div>
              <p v-if="formData.subtitle" class="mt-1 text-xs opacity-90">
                {{ formData.subtitle }}
              </p>
            </div>

            <!-- Preview Content -->
            <div class="p-4 space-y-4">
              <!-- Promotion Details Preview - Above -->
              <div
                v-if="
                  formData.promo_details &&
                  showPromoDetails &&
                  formData.promo_position === 'above'
                "
                class="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-3 mb-4"
              >
                <div class="flex items-start space-x-2">
                  <div
                    class="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg
                      class="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-orange-800 text-xs mb-1">
                      Promotion Details
                    </h3>
                    <div
                      class="text-orange-700 text-xs leading-relaxed whitespace-pre-line"
                    >
                      {{ formData.promo_details }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Content Preview in Order -->
              <template
                v-for="(item, index) in formData.content_order || []"
                :key="`content-${index}-${item}-${formData.content_order?.join('-') || ''}`"
              >
                <!-- Description Preview -->
                <div
                  v-if="
                    item === 'description' &&
                    formData.description &&
                    showDescription
                  "
                  class="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none"
                  v-html="formData.description"
                ></div>

                <!-- Image Preview - Single -->
                <div
                  v-if="
                    item === 'images' &&
                    imageList.filter((img) => img).length > 0 &&
                    showImage &&
                    formData.image_display_type === 'single'
                  "
                  class="rounded-lg overflow-hidden"
                >
                  <img
                    :src="imageList.find((img) => img) || ''"
                    :alt="formData.title || 'Preview'"
                    class="w-full h-auto rounded-lg"
                    style="max-height: none; object-fit: contain"
                    @error="handleImageError"
                  />
                </div>

                <!-- Image Preview - Carousel -->
                <div
                  v-if="
                    item === 'images' &&
                    imageList.filter((img) => img).length > 1 &&
                    showImage &&
                    formData.image_display_type === 'carousel'
                  "
                  class="rounded-lg overflow-hidden relative"
                >
                  <div class="relative w-full">
                    <div class="relative">
                      <img
                        v-for="(image, imgIndex) in imageList.filter(
                          (img) => img
                        )"
                        :key="imgIndex"
                        :src="image"
                        :alt="`${formData.title || 'Preview'} ${imgIndex + 1}`"
                        v-show="previewImageIndex === imgIndex"
                        class="w-full h-auto rounded-lg"
                        style="max-height: none; object-fit: contain"
                        @error="handleImageError"
                      />
                      <div
                        v-if="imageList.filter((img) => img).length > 1"
                        class="absolute inset-0 flex items-center justify-between p-2 pointer-events-none"
                      >
                        <button
                          type="button"
                          class="btn btn-circle btn-sm bg-black/50 text-white border-none hover:bg-black/70 pointer-events-auto"
                          @click.stop="
                            previewImageIndex =
                              (previewImageIndex -
                                1 +
                                imageList.filter((img) => img).length) %
                              imageList.filter((img) => img).length
                          "
                        >
                          <ChevronLeft :size="16" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-circle btn-sm bg-black/50 text-white border-none hover:bg-black/70 pointer-events-auto"
                          @click.stop="
                            previewImageIndex =
                              (previewImageIndex + 1) %
                              imageList.filter((img) => img).length
                          "
                        >
                          <ChevronRight :size="16" />
                        </button>
                      </div>
                      <div
                        v-if="imageList.filter((img) => img).length > 1"
                        class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 pointer-events-none"
                      >
                        <div
                          v-for="(image, imgIndex) in imageList.filter(
                            (img) => img
                          )"
                          :key="imgIndex"
                          class="w-2 h-2 rounded-full pointer-events-auto"
                          :class="
                            previewImageIndex === imgIndex
                              ? 'bg-white'
                              : 'bg-white/50'
                          "
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Video Preview -->
                <div
                  v-if="item === 'video' && formData.video_url && showVideo"
                  class="rounded-lg overflow-hidden"
                >
                  <div class="relative w-full" style="padding-bottom: 56.25%">
                    <iframe
                      v-if="
                        isYouTubeUrl(formData.video_url) ||
                        isVimeoUrl(formData.video_url)
                      "
                      :src="getEmbedUrl(formData.video_url)"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                      class="absolute top-0 left-0 w-full h-full rounded-lg"
                    ></iframe>
                    <video
                      v-else-if="formData.video_url"
                      :src="formData.video_url"
                      controls
                      class="absolute top-0 left-0 w-full h-full rounded-lg object-cover"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              </template>

              <!-- Promotion Details Preview - Below -->
              <div
                v-if="
                  formData.promo_details &&
                  showPromoDetails &&
                  formData.promo_position === 'below'
                "
                class="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-3"
              >
                <div class="flex items-start space-x-2">
                  <div
                    class="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg
                      class="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-orange-800 text-xs mb-1">
                      Promotion Details
                    </h3>
                    <div
                      class="text-orange-700 text-xs leading-relaxed whitespace-pre-line"
                    >
                      {{ formData.promo_details }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Valid Until Preview -->
              <div
                v-if="formData.valid_until && !isNonExpiry"
                class="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
              >
                <svg
                  class="w-4 h-4"
                  style="color: var(--color-primaryColor)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span class="font-medium">Valid until:</span>
                <span>{{ formatPreviewDate(formData.valid_until) }}</span>
              </div>
              <div
                v-else-if="isNonExpiry"
                class="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
              >
                <svg
                  class="w-4 h-4"
                  style="color: var(--color-primaryColor)"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span class="font-medium">Never Expires</span>
              </div>

              <!-- Action Button Preview -->
              <div v-if="formData.action_link" class="pt-2">
                <a
                  :href="formData.action_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center space-x-2 text-sm hover:opacity-90"
                  style="background-color: var(--color-primaryColor)"
                >
                  <span>{{ formData.action_text || 'Learn More' }}</span>
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
              </div>

              <!-- Empty State -->
              <div
                v-if="
                  !formData.title &&
                  !formData.description &&
                  !formData.image_url &&
                  !formData.video_url
                "
                class="text-center py-8 text-gray-400 text-sm"
              >
                <svg
                  class="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <p>Start filling the form to see preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
  import { ref, watch, computed, nextTick } from 'vue';
  import {
    X,
    FolderOpen,
    Paperclip,
    Lightbulb,
    Plus,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Eye,
    EyeOff,
  } from 'lucide-vue-next';
  import { apiConfig } from '../../config/api.js';
  import Editor from '@tinymce/tinymce-vue';
  const TinyMCEEditor = Editor;
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/skins/ui/oxide/skin.min.css';

  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
    announcement: {
      type: Object,
      default: null,
    },
    saving: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['close', 'submit']);

  const modal = ref(null);
  const imageFileInputs = ref([]);
  const videoFileInput = ref(null);
  const imageList = ref(['']);
  const videoFile = ref(null);
  const uploadingImages = ref([]);
  const uploadingVideo = ref(false);
  const imageUploadError = ref('');
  const videoUploadError = ref('');
  const previewImageIndex = ref(0);
  const showPreviewMobile = ref(false);
  const isNonExpiry = ref(false);

  const isEditing = computed(() => !!props.announcement);

  // Initialize formData FIRST before any computed properties that depend on it
  const formData = ref({
    title: '',
    subtitle: '',
    description: '',
    images: [],
    video_url: '',
    promo_details: '',
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: '',
    action_link: '',
    action_text: '',
    is_active: true,
    announcement_type: '',
    content_format: '',
    image_display_type: 'single',
    promo_position: 'below',
    content_order: ['description', 'images', 'video'],
  });

  // Computed properties for conditional field visibility
  const showDescription = computed(() => {
    const format = formData.value.content_format;
    return (
      format === 'all' ||
      format === 'text_image' ||
      format === 'video_text' ||
      format === 'text_only'
    );
  });

  const showImage = computed(() => {
    const format = formData.value.content_format;
    return (
      format === 'all' || format === 'text_image' || format === 'image_only'
    );
  });

  const showVideo = computed(() => {
    const format = formData.value.content_format;
    return (
      format === 'all' || format === 'video_text' || format === 'video_only'
    );
  });

  const showSubtitle = computed(() => {
    const type = formData.value.announcement_type;
    return type !== 'simple_text' && type !== 'promotional_banner';
  });

  const showPromoDetails = computed(() => {
    const type = formData.value.announcement_type;
    return type === 'promotional' || type === 'promotional_banner';
  });

  const imageRequired = computed(() => {
    return formData.value.content_format === 'image_only';
  });

  const videoRequired = computed(() => {
    return formData.value.content_format === 'video_only';
  });

  const textRequired = computed(() => {
    return formData.value.content_format === 'text_only';
  });

  // TinyMCE configuration for rich text editing
  const tinyMCEConfig = computed(() => ({
    menubar: false,
    height: 300,
    plugins: 'link lists',
    toolbar:
      'undo redo | formatselect fontsize | bold italic underline strikethrough | forecolor backcolor | blockquote | alignleft aligncenter alignright alignjustify | bullist numlist | link | removeformat',
    toolbar_mode: 'wrap',
    font_size_formats:
      '8px 10px 12px 14px 16px 18px 20px 24px 28px 32px 36px 48px 60px 72px',
    content_style:
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; } p { margin: 0.5em 0; }',
    valid_elements:
      'p[style],br,strong/b[style],em/i[style],u[style],s/strike[style],span[style|class],div[style|class],blockquote[style],ul,ol,li,a[href|target|rel|style],h1[style],h2[style],h3[style],h4[style],h5[style],h6[style]',
    valid_styles: {
      '*': 'color,background-color,font-size,font-family,text-align,text-decoration,font-weight,font-style,line-height',
    },
    branding: false,
    skin: false,
    content_css: false,
    license_key: 'gpl',
    placeholder: 'Enter description (supports rich text formatting)',
    setup: (editor) => {
      editor.on('init', () => {
        editor.setContent(formData.value.description || '');
      });
      editor.on('change keyup', () => {
        formData.value.description = editor.getContent();
      });
    },
  }));

  // Get available content items based on format
  const getAvailableContent = computed(() => {
    const items = [];
    if (showDescription.value) items.push('description');
    if (showImage.value) items.push('images');
    if (showVideo.value) items.push('video');
    return items;
  });

  // Initialize content order based on available items
  const initializeContentOrder = () => {
    const available = getAvailableContent.value;
    const currentOrder = formData.value.content_order || [];

    // If no current order, use default order based on available items
    if (currentOrder.length === 0) {
      const defaultOrder = ['description', 'images', 'video'];
      formData.value.content_order = defaultOrder.filter((item) =>
        available.includes(item)
      );
      return;
    }

    // Filter current order to only include available items
    const filteredOrder = currentOrder.filter((item) =>
      available.includes(item)
    );

    // Add any missing items to the end
    available.forEach((item) => {
      if (!filteredOrder.includes(item)) {
        filteredOrder.push(item);
      }
    });

    formData.value.content_order = filteredOrder;
  };

  const moveContentUp = (item) => {
    if (
      !formData.value.content_order ||
      formData.value.content_order.length === 0
    ) {
      initializeContentOrder();
    }
    const order = [...formData.value.content_order];
    const index = order.indexOf(item);
    if (index > 0) {
      [order[index - 1], order[index]] = [order[index], order[index - 1]];
      // Force reactivity by creating a new array
      formData.value.content_order = [...order];
    }
  };

  const moveContentDown = (item) => {
    if (
      !formData.value.content_order ||
      formData.value.content_order.length === 0
    ) {
      initializeContentOrder();
    }
    const order = [...formData.value.content_order];
    const index = order.indexOf(item);
    if (index < order.length - 1 && index >= 0) {
      [order[index], order[index + 1]] = [order[index + 1], order[index]];
      // Force reactivity by creating a new array
      formData.value.content_order = [...order];
    }
  };

  const isFirstContent = (item) => {
    if (
      !formData.value.content_order ||
      formData.value.content_order.length === 0
    ) {
      return false;
    }
    const index = formData.value.content_order.indexOf(item);
    return index === 0 || index === -1;
  };

  const isLastContent = (item) => {
    if (
      !formData.value.content_order ||
      formData.value.content_order.length === 0
    ) {
      return false;
    }
    const index = formData.value.content_order.indexOf(item);
    return index === formData.value.content_order.length - 1 || index === -1;
  };

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const resetForm = () => {
    formData.value = {
      title: '',
      subtitle: '',
      description: '',
      images: [],
      video_url: '',
      promo_details: '',
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: '',
      action_link: '',
      action_text: '',
      is_active: true,
      announcement_type: '',
      content_format: '',
      image_display_type: 'single',
      promo_position: 'below',
      content_order: ['description', 'images', 'video'],
    };
    imageList.value = [''];
    uploadingImages.value = [];
    videoFile.value = null;
    imageUploadError.value = '';
    videoUploadError.value = '';
    showPreviewMobile.value = false;
    isNonExpiry.value = false;
    initializeContentOrder();
  };

  const onNonExpiryChange = () => {
    if (isNonExpiry.value) {
      formData.value.valid_until = '';
    }
  };

  const addImageField = () => {
    imageList.value.push('');
    uploadingImages.value.push(false);
  };

  const removeImage = (index) => {
    imageList.value.splice(index, 1);
    uploadingImages.value.splice(index, 1);
    if (imageList.value.length === 0) {
      imageList.value.push('');
    }
  };

  const onFormatChange = () => {
    // Clear fields that are no longer relevant
    if (!showImage.value) {
      imageList.value = [''];
      uploadingImages.value = [];
      imageUploadError.value = '';
    }
    if (!showVideo.value) {
      formData.value.video_url = '';
      videoFile.value = null;
      videoUploadError.value = '';
    }
    if (!showDescription.value) {
      formData.value.description = '';
    }
    // Reinitialize content order when format changes
    nextTick(() => {
      initializeContentOrder();
    });
  };

  const handleImageError = (event) => {
    event.target.style.display = 'none';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(
      url
    );
  };

  const isVimeoUrl = (url) => {
    if (!url) return false;
    return /vimeo\.com\/(?:.*\/)?(\d+)/.test(url);
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';

    // YouTube
    if (isYouTubeUrl(url)) {
      const youtubeRegex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    // Vimeo
    if (isVimeoUrl(url)) {
      const vimeoRegex = /vimeo\.com\/(?:.*\/)?(\d+)/;
      const match = url.match(vimeoRegex);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }

    // Return original URL if not YouTube or Vimeo (for direct video files)
    return url;
  };

  const formatPreviewDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle datetime-local format (YYYY-MM-DDTHH:mm)
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleImageFileSelect = async (event, index = 0) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      imageUploadError.value = 'Please select an image file';
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      imageUploadError.value = 'Image file size must be less than 10MB';
      return;
    }

    imageUploadError.value = '';
    uploadingImages.value[index] = true;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await fetch(`${apiUrl}/uploads/announcements/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to upload image';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      imageList.value[index] = result.url || result.location;
      imageUploadError.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      imageUploadError.value = error.message || 'Failed to upload image';
    } finally {
      uploadingImages.value[index] = false;
      // Reset file input
      if (imageFileInputs.value[index]) {
        imageFileInputs.value[index].value = '';
      }
    }
  };

  const handleVideoFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      videoUploadError.value = 'Please select a video file';
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      videoUploadError.value = 'Video file size must be less than 100MB';
      return;
    }

    videoFile.value = file;
    videoUploadError.value = '';
    uploadingVideo.value = true;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const uploadFormData = new FormData();
      uploadFormData.append('video', file);

      const response = await fetch(`${apiUrl}/uploads/announcements/video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to upload video';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      formData.value.video_url = result.url || result.location;
      videoUploadError.value = '';
    } catch (error) {
      console.error('Error uploading video:', error);
      videoUploadError.value = error.message || 'Failed to upload video';
      videoFile.value = null;
    } finally {
      uploadingVideo.value = false;
      // Reset file input
      if (videoFileInput.value) {
        videoFileInput.value.value = '';
      }
    }
  };

  const loadAnnouncementData = () => {
    if (props.announcement) {
      // Load images: use new images array or fallback to image_url
      let images = [];
      if (props.announcement.images) {
        try {
          images =
            typeof props.announcement.images === 'string'
              ? JSON.parse(props.announcement.images)
              : props.announcement.images;
        } catch {
          images = [];
        }
      }
      // Fallback to image_url if images array is empty
      if (images.length === 0 && props.announcement.image_url) {
        images = [props.announcement.image_url];
      }

      imageList.value = images.length > 0 ? images : [''];
      uploadingImages.value = new Array(imageList.value.length).fill(false);

      formData.value = {
        title: props.announcement.title || '',
        subtitle: props.announcement.subtitle || '',
        description: props.announcement.description || '',
        images: images,
        video_url: props.announcement.video_url || '',
        promo_details: props.announcement.promo_details || '',
        valid_from: formatDateTimeLocal(props.announcement.valid_from),
        valid_until: props.announcement.valid_until
          ? formatDateTimeLocal(props.announcement.valid_until)
          : '',
        action_link: props.announcement.action_link || '',
        action_text: props.announcement.action_text || '',
        is_active:
          props.announcement.is_active !== undefined
            ? props.announcement.is_active
            : true,
        announcement_type: props.announcement.announcement_type || '',
        content_format: props.announcement.content_format || '',
        image_display_type: props.announcement.image_display_type || 'single',
        promo_position: props.announcement.promo_position || 'below',
        content_order: props.announcement.content_order
          ? typeof props.announcement.content_order === 'string'
            ? JSON.parse(props.announcement.content_order)
            : props.announcement.content_order
          : ['description', 'images', 'video'],
      };

      // Set non-expiry toggle based on valid_until
      isNonExpiry.value = !props.announcement.valid_until;
      // Initialize content order after loading
      initializeContentOrder();
    } else {
      resetForm();
    }
    // Always ensure content order is initialized
    nextTick(() => {
      initializeContentOrder();
    });
  };

  watch(
    () => props.isOpen,
    (newVal) => {
      if (newVal) {
        loadAnnouncementData();
        nextTick(() => {
          if (modal.value?.showModal) {
            modal.value.showModal();
          }
          // Initialize content order when modal opens
          initializeContentOrder();
        });
      } else {
        if (modal.value?.close) {
          modal.value.close();
        }
      }
    }
  );

  watch(
    () => props.announcement,
    () => {
      if (props.isOpen) {
        loadAnnouncementData();
      }
    },
    { deep: true }
  );

  const closeModal = () => {
    emit('close');
    resetForm();
  };

  const handleSubmit = () => {
    // Client-side validation - ensure required fields are filled
    if (
      !formData.value.content_format ||
      formData.value.content_format.trim() === ''
    ) {
      alert('Please select a Content Format');
      return;
    }
    if (
      !formData.value.announcement_type ||
      formData.value.announcement_type.trim() === ''
    ) {
      alert('Please select an Announcement Type');
      return;
    }

    // Filter out empty image URLs and prepare data
    const filteredImages = imageList.value.filter((img) => img && img.trim());

    // Normalize enum fields - convert empty strings to null
    const normalizedContentFormat =
      formData.value.content_format &&
      formData.value.content_format.trim() !== ''
        ? formData.value.content_format.trim()
        : null;
    const normalizedAnnouncementType =
      formData.value.announcement_type &&
      formData.value.announcement_type.trim() !== ''
        ? formData.value.announcement_type.trim()
        : null;

    // Double-check - if normalization resulted in null but we validated above, something is wrong
    if (normalizedContentFormat === null) {
      console.error(
        'Content format is null after normalization! Original value:',
        formData.value.content_format
      );
      alert('Content Format is required. Please select a format.');
      return;
    }
    if (normalizedAnnouncementType === null) {
      console.error(
        'Announcement type is null after normalization! Original value:',
        formData.value.announcement_type
      );
      alert('Announcement Type is required. Please select a type.');
      return;
    }

    const submitData = {
      ...formData.value,
      // Ensure enum fields are never empty strings - use normalized values
      content_format: normalizedContentFormat,
      announcement_type: normalizedAnnouncementType,
      images: filteredImages.length > 0 ? filteredImages : null,
      // Keep image_url for backward compatibility (use first image)
      image_url: filteredImages.length > 0 ? filteredImages[0] : null,
      // Store content_order as JSON string (if it's not already)
      content_order:
        typeof formData.value.content_order === 'string'
          ? formData.value.content_order
          : JSON.stringify(
              formData.value.content_order || ['description', 'images', 'video']
            ),
      // Clear valid_until if non-expiry is enabled
      valid_until: isNonExpiry.value
        ? null
        : formData.value.valid_until || null,
    };

    console.log(
      'Submitting announcement data:',
      JSON.stringify(submitData, null, 2)
    );
    emit('submit', submitData);
  };
</script>

<style scoped>
  /* Modal styles */
  .modal-box {
    max-height: 95vh;
  }

  /* Preview styling */
  .prose {
    color: #374151;
  }

  .prose p {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
  }

  .prose h1,
  .prose h2,
  .prose h3 {
    font-weight: 700;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .prose strong {
    font-weight: 600;
    color: #1f2937;
  }

  .prose a {
    color: var(--color-primaryColor);
    text-decoration: underline;
  }

  .prose a:hover {
    opacity: 0.8;
  }

  .prose ul,
  .prose ol {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    padding-left: 1.5em;
  }

  .prose li {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  /* Custom scrollbar for preview */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Custom toggle switch styling */
  /* Lighter green background track */
  .toggle {
    background-color: color-mix(
      in srgb,
      var(--color-primaryColor) 30%,
      transparent
    ) !important;
    border-color: var(--color-primaryColor) !important;
  }

  .toggle:checked {
    background-color: color-mix(
      in srgb,
      var(--color-primaryColor) 30%,
      transparent
    ) !important;
    border-color: var(--color-primaryColor) !important;
  }

  /* Circle/handle - always primary green */
  .toggle::before {
    background-color: var(--color-primaryColor) !important;
  }

  .toggle:checked::before {
    background-color: var(--color-primaryColor) !important;
  }

  /* Inactive toggle styling - gray when disabled */
  .toggle.toggle-inactive {
    background-color: #d1d5db !important;
    border-color: #9ca3af !important;
  }

  .toggle.toggle-inactive::before {
    background-color: #9ca3af !important;
  }
</style>
