/**
 * Mermaid diagrams helper
 * Essential functionality for decoding HTML entities in diagrams
 */
(function() {
  // Create the decoder function that fixes HTML entities
  function decodeHtmlEntities(text) {
    if (!text) return text;
    
    // Fixes for arrow syntax (most critical fix)
    text = text.replace(/--&gt;/g, '-->');
    
    // Common HTML entities
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    // Replace all encoded entities with their decoded versions
    return text.replace(/&[a-z0-9#]+;/gi, entity => {
      if (entities[entity]) {
        return entities[entity];
      }
      
      // Handle numeric entities
      if (entity.startsWith('&#')) {
        try {
          const tempEl = document.createElement('span');
          tempEl.innerHTML = entity;
          return tempEl.innerText;
        } catch(e) {
          return entity;
        }
      }
      
      return entity;
    });
  }
  
  // Immediately expose the function globally
  window.mermaidDebug = window.mermaidDebug || {};
  window.mermaidDebug.decodeHtmlEntities = decodeHtmlEntities;
})(); 