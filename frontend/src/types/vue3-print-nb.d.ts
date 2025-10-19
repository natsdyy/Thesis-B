declare module 'vue3-print-nb' {
  interface PrintOptions {
    printable: string | HTMLElement;
    type?: 'html' | 'pdf' | 'image' | string;
    style?: string;
  }

  interface Vue3PrintNbPlugin {
    install: (app: any) => void;
  }

  const plugin: Vue3PrintNbPlugin;
  export default plugin;
}
