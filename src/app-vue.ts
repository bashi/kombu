import Vue from 'vue';

function init() {
  const app = new Vue({
    el: '#app',
    data: {},
    methods: {
      selectFile: function() {}
    }
  });

  // @ts-ignore
  window.app = app;
}

document.addEventListener('DOMContentLoaded', () => init());
