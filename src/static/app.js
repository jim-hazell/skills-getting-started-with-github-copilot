document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list markup
        let participantsMarkup = "";
        if (details.participants && details.participants.length > 0) {
          const items = details.participants
            .map((p) => {
              // Derive a short label / initials from an email or name
              const label = String(p);
              const local = label.split("@")[0] || label;
              const initials = local
                .split(/[\.\-_ ]+/)
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return `
                <li class="participant" title="${label}" data-activity="${name}" data-email="${label}">
                  <span class="avatar">${initials}</span>
                  <span class="name">${label}</span>
                  <button class="delete-btn" aria-label="Unregister ${label}" data-activity="${name}" data-email="${label}">🗑️</button>
                </li>
              `;
            })
            .join("");
          participantsMarkup = `<ul class="participant-list">${items}</ul>`;
        } else {
          participantsMarkup = `<div class="empty">No participants yet</div>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <h5>Participants</h5>
            ${participantsMarkup}
          </div>
        `;

        activitiesList.appendChild(activityCard);

          // Attach delete/unregister handlers for this activity's participant buttons
          const deleteButtons = activityCard.querySelectorAll('.delete-btn');
          deleteButtons.forEach((btn) => {
            btn.addEventListener('click', async (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const activity = btn.getAttribute('data-activity');
              const email = btn.getAttribute('data-email');

              if (!activity || !email) return;

              // Confirm quick UX (optional) - simple confirm to avoid accidental removals
              const ok = confirm(`Unregister ${email} from ${activity}?`);
              if (!ok) return;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
                  { method: 'DELETE' }
                );

                const result = await resp.json().catch(() => ({}));

                if (resp.ok) {
                  // Re-fetch activities to update participant lists and availability counts
                  await fetchActivities();

                  messageDiv.textContent = result.message || `${email} unregistered from ${activity}`;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');

                  setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                } else {
                  messageDiv.textContent = result.detail || 'Failed to unregister participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Error unregistering participant:', err);
                messageDiv.textContent = 'Failed to unregister. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            });
          });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the UI shows the new participant and updated availability
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
