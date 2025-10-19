<template>
  <div class="flex flex-col items-center relative">
    <!-- Node Card -->
    <div
      class="group bg-white/95 border border-gray-200 hover:border-primaryColor/50 shadow-sm hover:shadow-md rounded-2xl px-4 sm:px-6 py-4 sm:py-5 w-[16rem] sm:w-72 md:w-80 text-center transition-all duration-300"
    >
      <!-- Avatar / Logo -->
      <div
        class="mx-auto mb-2 sm:mb-3 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primaryColor/10 to-primaryColor/5 flex items-center justify-center overflow-hidden shadow-sm"
      >
        <img
          v-if="isRoot"
          src="/logo1.png"
          alt="logo"
          class="h-10 w-10 object-contain"
        />
        <User2 v-else class="h-6 w-6 text-primaryColor" />
      </div>

      <!-- Title -->
      <div
        class="text-[12px] sm:text-[13px] tracking-wide text-gray-500 font-medium"
      >
        {{ node.title }}
      </div>

      <!-- Name -->
      <div class="text-sm sm:text-base font-semibold text-gray-900 mt-0.5">
        {{ node.person_name || 'Unassigned' }}
      </div>

      <!-- Action Buttons -->
      <div
        v-if="canModify"
        class="mt-3 sm:mt-4 flex items-center justify-center gap-2 opacity-90 group-hover:opacity-100 transition-all"
      >
        <button
          class="h-8 w-8 flex items-center justify-center rounded-full bg-primaryColor/10 text-primaryColor hover:bg-primaryColor/20 transition"
          title="Add child"
          @click="$emit('add-child', node.id)"
        >
          <Plus class="h-4 w-4" />
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          title="Edit"
          @click="$emit('edit-node', node)"
        >
          <Pencil class="h-4 w-4" />
        </button>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
          title="Delete"
          @click="$emit('delete-node', node)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Connectors & Children -->
    <div v-if="children && children.length" class="relative mt-6 sm:mt-8">
      <!-- vertical connector -->
      <div
        class="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-px bg-gray-300"
      ></div>

      <!-- horizontal connector line -->
      <div
        class="relative flex items-start justify-center gap-6 sm:gap-10 md:gap-12"
      >
        <div
          class="absolute -top-6 left-0 right-0 border-t border-gray-300"
        ></div>

        <!-- Children Nodes -->
        <div
          v-for="c in children"
          :key="c.id"
          class="relative flex flex-col items-center"
        >
          <!-- vertical line to child -->
          <div class="absolute -top-6 h-6 w-px bg-gray-300"></div>
          <OrgNode
            :node="c"
            :children="getChildren ? getChildren(c.id) : []"
            :getChildren="getChildren"
            @add-child="$emit('add-child', $event)"
            @edit-node="$emit('edit-node', $event)"
            @delete-node="$emit('delete-node', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { User2, Plus, Pencil, Trash2 } from 'lucide-vue-next';

  export default {
    name: 'OrgNode',
    props: {
      node: { type: Object, required: true },
      children: { type: Array, default: () => [] },
      getChildren: { type: Function, default: null },
      isRoot: { type: Boolean, default: false },
      canModify: { type: Boolean, default: true },
    },
    emits: ['add-child', 'edit-node', 'delete-node'],
    components: { User2, Plus, Pencil, Trash2 },
  };
</script>
