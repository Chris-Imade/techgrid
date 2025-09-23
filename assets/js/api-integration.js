/**
 * Tech Grid Series API Integration
 * Base URL: https://techgrid-server.onrender.com
 */

class TechGridAPI {
  constructor() {
    this.baseURL = "http://localhost:3000";
    this.init();
  }

  init() {
    this.initContactForm();
    this.initRegistrationForm();
    this.initNewsletterForms();
  }

  // Utility Methods
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const result = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", result);
        console.error("Validation Errors:", result.errors);
        // Create a more detailed error object
        const error = new Error(result.message || "Request failed");
        error.status = response.status;
        error.details = result;
        throw error;
      }

      return result;
    } catch (error) {
      console.error("API Request failed:", error);
      console.error("Request URL:", url);
      console.error("Request Options:", options);
      throw error;
    }
  }

  showMessage(message, type = "success") {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(".api-message");
    existingMessages.forEach((msg) => msg.remove());

    // Create new message
    const messageDiv = document.createElement("div");
    messageDiv.className = `api-message alert alert-${
      type === "success" ? "success" : type === "error" ? "danger" : "warning"
    }`;
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
    messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${message}</span>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
            </div>
        `;

    document.body.appendChild(messageDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

  setLoading(button, isLoading) {
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = "Processing...";
      button.disabled = true;
      button.style.opacity = "0.7";
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
      button.style.opacity = "1";
    }
  }

  displayValidationErrors(errors, form) {
    // Clear existing error messages
    const existingErrors = form.querySelectorAll(".field-error");
    existingErrors.forEach((error) => error.remove());

    // Clear field highlighting
    const fields = form.querySelectorAll("input, textarea, select");
    fields.forEach((field) => (field.style.borderColor = ""));

    console.log("Displaying validation errors:", errors);

    if (errors) {
      // Handle both array format and object format
      let errorList = [];

      if (Array.isArray(errors)) {
        errorList = errors;
      } else if (typeof errors === "object") {
        // Convert object format to array format
        errorList = Object.keys(errors).map((field) => ({
          field: field,
          message: Array.isArray(errors[field]) ? errors[field][0] : errors[field],
        }));
      }

      errorList.forEach((error) => {
        console.log("Processing error:", error);
        let field = form.querySelector(`[name="${error.field}"]`);
        
        // Special handling for checkbox fields like terms
        if (!field && error.field === 'terms') {
          field = form.querySelector('#terms');
        }
        
        if (field) {
          const errorDiv = document.createElement("div");
          errorDiv.className = "field-error text-danger small mt-1";
          errorDiv.textContent = error.message;
          
          // For checkboxes, append error after the label
          if (field.type === 'checkbox') {
            const checkboxContainer = field.closest('.form-check') || field.parentNode;
            checkboxContainer.appendChild(errorDiv);
          } else {
            field.parentNode.appendChild(errorDiv);
            // Also highlight the field
            field.style.borderColor = "#dc3545";
          }
        } else {
          console.warn(`Field not found: ${error.field}`);
          // Show a general error message if field not found
          this.showMessage(`${error.field}: ${error.message}`, 'error');
        }
      });
    }
  }

  // Contact Form Integration
  initContactForm() {
    const contactForm =
      document.getElementById("contactForm") ||
      document.querySelector('form[action*="contact"]');
    if (!contactForm) return;

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitButton = contactForm.querySelector('button[type="submit"]');
      this.setLoading(submitButton, true);

      try {
        const formData = new FormData(contactForm);
        // Format phone number to international format
        let phone = formData.get("phone");
        if (phone && !phone.startsWith('+')) {
          // If phone doesn't start with +, assume it's a Nigerian number and add +234
          phone = phone.replace(/^0/, ''); // Remove leading 0
          phone = '+234' + phone;
        }

        const data = {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: phone,
          subject: formData.get("subject"),
          message: formData.get("message"),
        };

        console.log("Sending contact form data:", data);

        const result = await this.makeRequest("/api/contact", {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (result.success) {
          this.showMessage(
            "Thank you! Your message has been sent successfully. We'll get back to you soon.",
            "success"
          );
          contactForm.reset();
        }
      } catch (error) {
        console.error("Contact form submission error:", error);

        // Display field-specific errors if available
        if (error.details && error.details.errors) {
          this.displayValidationErrors(error.details.errors, contactForm);
          this.showMessage(
            "Please fix the errors below and try again.",
            "error"
          );
        } else if (error.message.includes("Validation failed")) {
          this.showMessage("Please check your form and try again.", "error");
        } else if (error.message.includes("Too many")) {
          this.showMessage(
            "Too many submissions. Please try again in 15 minutes.",
            "warning"
          );
        } else {
          this.showMessage(
            "Something went wrong. Please try again later.",
            "error"
          );
        }
      } finally {
        this.setLoading(submitButton, false);
      }
    });
  }

  // Registration Form Integration
  initRegistrationForm() {
    const registrationForm =
      document.getElementById("registrationForm") ||
      document.querySelector('form[action*="register"]');
    if (!registrationForm) return;

    registrationForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitButton = registrationForm.querySelector(
        'button[type="submit"]'
      );
      this.setLoading(submitButton, true);

      try {
        const formData = new FormData(registrationForm);

        // Collect interests (checkboxes)
        const interests = [];
        const interestCheckboxes = registrationForm.querySelectorAll(
          'input[name="interests"]:checked'
        );
        interestCheckboxes.forEach((checkbox) =>
          interests.push(checkbox.value)
        );

        // Format phone number to international format
        let phone = formData.get("phone");
        if (phone && !phone.startsWith('+')) {
          // If phone doesn't start with +, assume it's a Nigerian number and add +234
          phone = phone.replace(/^0/, ''); // Remove leading 0
          phone = '+234' + phone;
        }

        const data = {
          firstName: formData.get("firstName") || formData.get("first_name"),
          lastName: formData.get("lastName") || formData.get("last_name"),
          email: formData.get("email"),
          phone: phone,
          company: formData.get("company") || "",
          jobTitle: formData.get("jobTitle") || formData.get("job_title") || "",
          experience: formData.get("experience") || "intermediate",
          interests: interests,
          expectations: formData.get("expectations") || "",
          newsletter:
            formData.get("newsletter") === "on" ||
            formData.get("newsletter") === "true",
          terms:
            formData.get("terms") === "on" || formData.get("terms") === "1" || formData.get("terms") === "true",
        };

        console.log("Sending registration form data:", data);

        const result = await this.makeRequest("/api/register", {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (result.success) {
          this.showMessage(
            `Registration successful! Your registration number is ${result.data.registrationNumber}. Check your email for confirmation.`,
            "success"
          );
          registrationForm.reset();
        }
      } catch (error) {
        console.error("Registration form submission error:", error);
        
        // Display field-specific errors if available
        if (error.details && error.details.errors) {
          this.displayValidationErrors(error.details.errors, registrationForm);
          this.showMessage("Please fix the errors below and try again.", "error");
        } else if (error.message.includes("already registered")) {
          this.showMessage(
            "You are already registered for this event! Check your email for your registration details.",
            "warning"
          );
        } else if (error.message.includes("Validation failed")) {
          this.showMessage("Please check your form and try again.", "error");
        } else if (error.message.includes("Too many")) {
          this.showMessage(
            "Too many registration attempts. Please try again in 1 hour.",
            "warning"
          );
        } else {
          this.showMessage(
            "Registration failed. Please try again later.",
            "error"
          );
        }
      } finally {
        this.setLoading(submitButton, false);
      }
    });
  }

  // Newsletter Forms Integration
  initNewsletterForms() {
    const newsletterForms = document.querySelectorAll(
      'form[action*="newsletter"], .newsletter-form, .footer-newsletter-form'
    );

    newsletterForms.forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        this.setLoading(submitButton, true);

        try {
          const formData = new FormData(form);
          const email = formData.get("email");

          if (!email) {
            throw new Error("Email is required");
          }

          const data = {
            email: email,
            preferences: {
              frequency: "weekly",
            },
            source: "website",
          };

          const result = await this.makeRequest("/api/newsletter", {
            method: "POST",
            body: JSON.stringify(data),
          });

          if (result.success) {
            this.showMessage(
              "Successfully subscribed to our newsletter!",
              "success"
            );
            form.reset();
          }
        } catch (error) {
          if (error.message.includes("already subscribed")) {
            this.showMessage(
              "You are already subscribed to our newsletter!",
              "warning"
            );
          } else if (error.message.includes("Too many")) {
            this.showMessage(
              "Too many subscription attempts. Please try again later.",
              "warning"
            );
          } else {
            this.showMessage("Subscription failed. Please try again.", "error");
          }
        } finally {
          this.setLoading(submitButton, false);
        }
      });
    });
  }

  // Health Check Method
  async checkServerHealth() {
    try {
      const result = await this.makeRequest("/health");
      console.log("Server Status:", result);
      return result.success;
    } catch (error) {
      console.error("Server health check failed:", error);
      return false;
    }
  }
}

// CSS for animations and messages
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .api-message {
        animation: slideIn 0.3s ease-out;
    }

    .field-error {
        color: #dc3545 !important;
        font-size: 0.875rem !important;
        margin-top: 0.25rem !important;
    }

    .alert-success {
        background-color: #d4edda;
        border-color: #c3e6cb;
        color: #155724;
    }

    .alert-danger {
        background-color: #f8d7da;
        border-color: #f5c6cb;
        color: #721c24;
    }

    .alert-warning {
        background-color: #fff3cd;
        border-color: #ffeaa7;
        color: #856404;
    }
`;
document.head.appendChild(style);

// Initialize API when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.techGridAPI = new TechGridAPI();

  // Optional: Check server health on load
  window.techGridAPI.checkServerHealth().then((isHealthy) => {
    if (!isHealthy) {
      console.warn("Tech Grid API server may be unavailable");
    }
  });
});

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = TechGridAPI;
}
