// Login/Register functionality with TypeScript
interface LoginData {
    username: string;
    password: string;
}

interface LoginResponse {
    token?: string;
    error?: string;
}

interface userDataType {
	username: string;
	email?: string;
	displayName?: string;
	password: string;
}

function showTab(tabName: "login" | "register"): void {
    // Reset all tab buttons to inactive state
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('button[onclick*="showTab"]');
    tabButtons.forEach(tab => {
        tab.className =
            "flex-1 p-4 bg-gray-100 text-gray-700 border-none cursor-pointer transition-all duration-300 font-medium hover:bg-indigo-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

        if (tab.textContent === "Login") {
            tab.className += " rounded-l-md";
        } else {
            tab.className += " rounded-r-md";
        }
    });

    // Hide all forms
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.classList.add("hidden");
        loginForm.classList.remove("block");
    }

    if (registerForm) {
        registerForm.classList.add("hidden");
        registerForm.classList.remove("block");
    }

    // Set active tab button
    tabButtons.forEach(tab => {
        const text = tab.textContent?.trim();
        if (
            (tabName === "login" && text === "Login") ||
            (tabName === "register" && text === "Register")
        ) {
            tab.className = tab.className.replace(
                "bg-gray-100 text-gray-700",
                "bg-indigo-600 text-white"
            );
        }
    });

    // Show the corresponding form
    const targetForm = document.getElementById(`${tabName}Form`);
    if (targetForm) {
        targetForm.classList.remove("hidden");
        targetForm.classList.add("block");
    }
}

function isValidPassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[_\W]).{8,}$/;
  return regex.test(password);
}

/**
 * Generalized Register handler
 */
async function register(event?: SubmitEvent): Promise<void> {
    let username = "";
    let password = "";
    let emailOptional = "";
    let displayNameOptional = "";

    if (event) {
		event.preventDefault();
        // If called as form submit
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
		const userData: Record<string, string> = {
			username: (formData.get('username') as string) || "",
			emailOptional: (formData.get('email') as string) || "",
			displayNameOptional: (formData.get('displayName') as string) || "",
			password: (formData.get('password') as string) || ""
		};

		/*
		if (isValidPassword(password)) {
			alert("Password must have at least one lowercase letter, one eppercase letter, one number, one special character, and at least 8 characters");
			if (event) (event.target as HTMLFormElement).reset();
			return ;
		}
		*/
		
		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(userData),
			});

			const result = await response.json();

			if (response.ok) {
				showMessage("Registration successful! You can now login.", "success");
        		alert(result.message || "Registration successful!");
				showTab("login");
				if (event) (event.target as HTMLFormElement).reset();
			} else {
				showMessage(result.error || "Registration failed", "error");
			}
		} catch (error: any) {
			showMessage("Connection error: " + error.message, "error");
		}
    } 
	else {
		alert("Please fill in all required fields");
		return;	
	}

}
/**
 * Generalized Login handler
 */
async function login(event?: SubmitEvent): Promise<void> {
    let username = "";
    let password = "";

    if (event) {
        // If called from a form submit
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);

        username = (formData.get("username") as string) || "";
        password = (formData.get("password") as string) || "";
    } else {
        // If called directly (fallback)
        const usernameElement = document.getElementById("log-user") as HTMLInputElement | null;
        const passwordElement = document.getElementById("log-pass") as HTMLInputElement | null;

        username = usernameElement?.value.trim() || "";
        password = passwordElement?.value.trim() || "";
    }

    if (username === "" || password === "") {
        alert("Please fill in all fields");
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result: LoginResponse = await response.json();

        if (response.ok && result.token) {
            localStorage.setItem("token", result.token);
            showMessage("Login successful!", "success");
			window.location.href = '/';
            if (event) (event.target as HTMLFormElement).reset();
        } else {
            showMessage(result.error || "Login failed", "error");
        }
    } catch (error: any) {
        showMessage("Connection error: " + error.message, "error");
    }
}

/**
 * Show messages
 */
function showMessage(text: string, type: "success" | "error"): void {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;

    const messageClasses =
        type === "success"
            ? "bg-green-50 text-green-800 border border-green-200 p-3 rounded-md text-center mt-4"
            : "bg-red-50 text-red-800 border border-red-200 p-3 rounded-md text-center mt-4";

    messageDiv.innerHTML = `<div class="${messageClasses}">${text}</div>`;

    setTimeout(() => {
        messageDiv.innerHTML = "";
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  // 🔑 Check if Google OAuth sent back a token in the hash
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get('token');
  const viaGoogle = hash.get('viaGoogle');
  if (token) {
    localStorage.setItem('token', token);
    if (viaGoogle === "true")
            localStorage.setItem('viaGoogle', viaGoogle);
    else
            localStorage.removeItem('viaGoogle');
    window.location.hash = ''; // clean up the URL
    showMessage('Google login successful!', 'success');
    window.location.href = '/';
  }
});


// Make functions available globally
(window as any).register = register;
(window as any).login = login;
(window as any).isValidPassword = isValidPassword;