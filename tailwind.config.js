import daisyui from "daisyui"

module.exports = {
  content: [
    './templates/**/*.{html,js,css,tmpl}',
    './static/css/vendor.css',
    './static/js/*.js',
    './static/js/**/*.js',
  ],
  plugins: [
    daisyui,
    require('@tailwindcss/forms'),
  ],
  daisyui: {
    themes: ["synthwave", "light", "dark", "business", "dracula", "night"]
  }
}
