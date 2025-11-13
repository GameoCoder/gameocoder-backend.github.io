async function fetchCurrentClass() {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Not logged in!");
        window.location.href = "../index.html";
        return;
      }

      try {
        const response = await fetch("https://gameocoder-backend-github-io.onrender.com/faculty/current-class", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();
        const classInfoDiv = document.getElementById("class-info");

        if (!response.ok) {
          classInfoDiv.innerHTML = `<p class="no-class">${data.message || "Error fetching schedule"}</p>`;
          return;
        }

        if (data && data.section_name) {
            const { section_name, room_number, start_time, end_time, schedule_id } = data;
            // Save schedule info to sessionStorage for next page
            sessionStorage.setItem("schedule_id", schedule_id);
            sessionStorage.setItem("section_name", section_name);
            sessionStorage.setItem("classroom_number", room_number);

            document.getElementById("attendanceBtn").style.display = "block";
            document.getElementById("attendanceBtn").onclick = () => {
                window.location.href = "./attendance.html";
            };
        } else {
          classInfoDiv.innerHTML = `<p class="no-class">No class right now</p>`;
        }
      } catch (err) {
        console.error(err);
        document.getElementById("class-info").innerHTML =
          `<p class="no-class">Error: Could not connect to server</p>`;
      }
    }