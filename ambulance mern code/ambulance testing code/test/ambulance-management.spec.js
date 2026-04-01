const { test, expect } = require("@playwright/test");

test.describe("Ambulance Management UI", () => {
  test("home page loads and navbar routes are visible", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Smart Ambulance Response and Management System" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Hire Ambulance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Track", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Driver" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  test("hire ambulance form submits successfully with mocked API", async ({ page }) => {
    await page.route("**/api/ambulance/book", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Ambulance request created successfully.",
          request: { _id: "req-1", status: "Pending" },
        }),
      });
    });

    await page.goto("/hire-ambulance");

    await page.getByLabel("Patient Name").fill("Test Patient");
    await page.getByLabel("Caller Name").fill("Test Caller");
    await page.getByLabel("Caller Phone Number").fill("9876543210");
    await page.getByLabel("Ambulance Type").selectOption("Basic Life Support");
    await page.getByLabel("Patient Latitude (Tamil Nadu)").fill("13.0827");
    await page.getByLabel("Patient Longitude (Tamil Nadu)").fill("80.2707");
    await page.getByRole("button", { name: "Submit Request" }).click();

    await expect(page.getByText("Ambulance request submitted. Status: Pending")).toBeVisible();
  });

  test("driver registration submits with license image and mocked API", async ({ page }) => {
    await page.route("**/api/driver/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Driver registered successfully.",
          driverId: "driver-1",
        }),
      });
    });

    await page.goto("/driver-register");

    await page.getByLabel("Driver Name").fill("Driver One");
    await page.getByLabel("License Number").fill("TN-TEST-1234");
    await page.getByLabel("Phone Number").fill("9123456789");
    await page.getByLabel("Ambulance Number").fill("TN09AB1234");
    await page.getByLabel("Ambulance Type").selectOption("Advanced Life Support");
    await page.getByLabel("Password").fill("secret123");
    await page.getByLabel("Current Latitude (Tamil Nadu)").fill("13.0827");
    await page.getByLabel("Current Longitude (Tamil Nadu)").fill("80.2707");

    await page.locator("#licenseImage").setInputFiles({
      name: "license.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-license-image"),
    });

    await page.getByRole("button", { name: "Register Driver" }).click();

    await expect(page.getByText("Driver registration submitted for admin approval.")).toBeVisible();
  });

  test("driver login shows pending approval message when backend rejects login", async ({ page }) => {
    await page.route("**/api/driver/login", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Your registration is pending admin approval.",
        }),
      });
    });

    await page.goto("/driver-login");

    await page.getByLabel("Phone Number").fill("9123456789");
    await page.getByLabel("Password").fill("secret123");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Your registration is pending admin approval.")).toBeVisible();
  });

  test("admin login redirects to dashboard with mocked API", async ({ page }) => {
    await page.route("**/api/admin/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Admin login successful.",
          admin: { email: "admin@ambulance.com" },
        }),
      });
    });

    await page.route("**/api/requests", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/admin/drivers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/dispatch/map-data", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          district: {
            name: "Tamil Nadu",
            bounds: { minLat: 8, maxLat: 13.6, minLon: 76, maxLon: 80.4 },
          },
          counts: { availableDrivers: 0, pendingRequests: 0, recentAssignments: 0 },
          drivers: [],
          requests: [],
          assignments: [],
        }),
      });
    });

    await page.goto("/admin-login");

    await page.getByLabel("Email").fill("admin@ambulance.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Login as Admin" }).click();

    await expect(page).toHaveURL(/\/admin-dashboard/);
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  });
});
