/**
 * Creates a stylish notification with DaisyUI
 * @param {string} message - The notification message
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds before auto-dismiss (0 for no auto-dismiss)
 * @param {boolean} showIcon - Whether to show an icon
 * @param {string} position - Position: 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
 */
function createNotification(message, type = 'info', duration = 5000, showIcon = true, position = 'top-right') {
  // Create container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = `fixed z-50 flex flex-col gap-2 p-2 md:p-4 ${getPositionClasses(position)}`;
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert shadow-lg w-full max-w-[95vw] md:max-w-md transform transition-all duration-300 ease-in-out ${getTypeClasses(type)}`;
  
  // Add subtle animation based on position
  if (position.includes('top')) {
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
  } else {
    notification.style.transform = 'translateY(20px)';
    notification.style.opacity = '0';
  }

  // Create content
  const content = `
    <div class="flex items-start md:items-center justify-between w-full">
      <div class="flex items-start md:items-center gap-2">
        ${showIcon ? getIcon(type) : ''}
        <div>
          <h3 class="font-bold text-base md:text-lg">${getTitle(type)}</h3>
          <div class="text-xs md:text-sm opacity-90">${message}</div>
        </div>
      </div>
      <button class="btn btn-circle btn-xs btn-ghost ml-2 flex-shrink-0" onclick="this.parentElement.parentElement.remove()">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;
  
  notification.innerHTML = content;
  container.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 10);
  
  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => {
      notification.style.transform = position.includes('top') ? 'translateY(-20px)' : 'translateY(20px)';
      notification.style.opacity = '0';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
  }
  
  // Return the notification element in case further manipulation is needed
  return notification;
}

function getPositionClasses(position) {
  switch (position) {
    case 'top': return 'top-0 inset-x-0 items-center';
    case 'bottom': return 'bottom-0 inset-x-0 items-center';
    case 'top-left': return 'top-0 left-0 items-start';
    case 'top-right': return 'top-0 right-0 items-end';
    case 'bottom-left': return 'bottom-0 left-0 items-start';
    case 'bottom-right': return 'bottom-0 right-0 items-end';
    default: return 'top-0 right-0 items-end';
  }
}

function getTypeClasses(type) {
  switch (type) {
    case 'success': return 'alert-success text-success-content';
    case 'error': return 'alert-error text-error-content';
    case 'warning': return 'alert-warning text-warning-content';
    case 'info': return 'alert-info text-info-content';
    default: return 'alert-info text-info-content';
  }
}

function getIcon(type) {
  switch (type) {
    case 'success':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`;
    case 'error':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`;
    case 'warning':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>`;
    case 'info':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>`;
  }
}

function getTitle(type) {
  switch (type) {
    case 'success': return 'Yay! 🎉';
    case 'error': return 'Oops! 😬';
    case 'warning': return 'Heads up! ⚠️';
    case 'info': return 'FYI! 💡';
    default: return 'Notice! 📢';
  }
}
