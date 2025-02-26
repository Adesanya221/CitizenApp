// Sample incident data
const incidents = [
  {
    id: 1,
    type: "accident",
    title: "Traffic Accident on Main Street",
    description: "Two-vehicle collision, emergency services on scene",
    location: "Main Street & 5th Avenue",
    timestamp: "2024-02-20T10:30:00",
    status: "active",
  },
  {
    id: 2,
    type: "fight",
    title: "Disturbance at Central Park",
    description: "Group altercation reported near fountain",
    location: "Central Park",
    timestamp: "2024-02-20T09:15:00",
    status: "resolved",
  },
];

// Render incidents in the feed
function renderIncidents(incidents) {
  const feed = document.getElementById('incident-feed');
  feed.innerHTML = incidents.map(incident => `
    <div class="card p-4 hover:shadow-lg transition-shadow animate-fade-in">
      ${incident.images && incident.images.length > 0 ? `
        <div class="image-grid mb-4">
          ${incident.images.map(img => `
            <img src="${img}" alt="Incident image" class="incident-image rounded-lg object-cover">
          `).join('')}
        </div>
      ` : ''}
      <div class="inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 
        ${incident.type === 'accident' ? 'bg-incident-accident/10 text-incident-accident' : 'bg-incident-fight/10 text-incident-fight'}">
        ${incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
      </div>
      <h3 class="text-lg font-semibold mb-2">${incident.title}</h3>
      <p class="text-sm text-muted-foreground mb-4">${incident.description}</p>
      <div class="flex items-center text-sm text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        ${incident.location}
      </div>
    </div>
  `).join('');
}

// Handle form submission
document.getElementById('report-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Convert uploaded files to base64 strings
  const imageFiles = document.getElementById('incident-images').files;
  const imagePromises = Array.from(imageFiles).map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  });
  
  const images = await Promise.all(imagePromises);
  
  const formData = {
    type: document.getElementById('incident-type').value,
    title: document.getElementById('incident-title').value,
    description: document.getElementById('incident-description').value,
    location: document.getElementById('incident-location').value,
    timestamp: new Date().toISOString(),
    status: 'active',
    id: incidents.length + 1,
    images: images, // Add images array to the incident data
  };

  // Add new incident to the array
  incidents.unshift(formData);
  
  // Re-render incidents
  renderIncidents(incidents);
  
  // Reset form
  e.target.reset();
  
  // Show success message (you can enhance this with a proper toast notification)
  alert('Incident reported successfully!');
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  renderIncidents(incidents);

  // Add event listeners for filter buttons
  document.querySelectorAll('.btn-outline').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active state from all buttons
      document.querySelectorAll('.btn-outline').forEach(btn => {
        btn.classList.remove('bg-primary', 'text-primary-foreground');
      });
      
      // Add active state to clicked button
      button.classList.add('bg-primary', 'text-primary-foreground');

      // Filter incidents (to be implemented)
      const filterType = button.textContent?.toLowerCase();
      const filteredIncidents = filterType === 'all incidents' 
        ? incidents 
        : incidents.filter(incident => incident.type === filterType?.slice(0, -1));
      
      renderIncidents(filteredIncidents);
    });
  });

  // Profile Dropdown Toggle
  const profileDropdown = document.getElementById('user-profile-dropdown');
  const profileMenu = document.getElementById('profile-menu');
  const profileButton = profileDropdown.querySelector('button');

  profileButton.addEventListener('click', () => {
    const isExpanded = profileButton.getAttribute('aria-expanded') === 'true';
    profileButton.setAttribute('aria-expanded', !isExpanded);
    profileMenu.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!profileDropdown.contains(e.target)) {
      profileMenu.classList.add('hidden');
      profileButton.setAttribute('aria-expanded', 'false');
    }
  });

  // Logout button handler
  document.getElementById('logout-button')?.addEventListener('click', () => {
    // Add your logout logic here
    console.log('Logging out...');
  });
});