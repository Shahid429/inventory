// Registers the service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful:', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}
