// Script to check if all dependencies are properly loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('=== Dependency Check Results ===');
  console.log('jQuery:', typeof jQuery !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
  console.log('Marked.js:', typeof marked !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
  console.log('DOMPurify:', typeof DOMPurify !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
  console.log('Highlight.js:', typeof hljs !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
  console.log('Mermaid.js:', typeof mermaid !== 'undefined' ? 'Loaded ✅' : 'Missing ❌');
  
  // Check browser console for these results
  try {
    if (typeof marked !== 'undefined') {
      console.log('Marked.js version:', marked.getDefaults().renderer.constructor.name ? 'Available' : 'Unknown');
    }
    if (typeof hljs !== 'undefined') {
      console.log('Highlight.js languages:', Object.keys(hljs.listLanguages()).length || 'Unknown');
      console.log('Mermaid language registered:', hljs.getLanguage('mermaid') ? 'Yes ✅' : 'No ❌');
    }
    if (typeof mermaid !== 'undefined') {
      console.log('Mermaid.js version:', mermaid.version || 'Unknown');
    }
  } catch (e) {
    console.error('Error checking versions:', e);
  }
}); 