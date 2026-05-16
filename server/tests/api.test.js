import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

let adminToken = "";
let viewerToken = "";

beforeAll(async () => {
  const adminLogin = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "Admin123!"
  });
  adminToken = adminLogin.body.token;

  const viewerLogin = await request(app).post("/api/auth/login").send({
    username: "viewer",
    password: "Viewer123!"
  });
  viewerToken = viewerLogin.body.token;
});

describe("Auth flow", () => {
  it("logs in with valid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      username: "engineer",
      password: "Engineer123!"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  it("rejects invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      username: "engineer",
      password: "wrong-password"
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("Role model and validation", () => {
  it("blocks viewer from creating asset", async () => {
    const response = await request(app)
      .post("/api/assets")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        name: "Storage S-1",
        type: "storage",
        status: "active",
        location: "DC-03"
      });

    expect(response.statusCode).toBe(403);
  });

  it("returns validation error for malformed asset payload", async () => {
    const response = await request(app)
      .post("/api/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "",
        type: "x",
        status: "broken",
        location: ""
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Ошибка валидации");
  });

  it("creates asset for admin", async () => {
    const response = await request(app)
      .post("/api/assets")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Backup Server B-9",
        type: "server",
        status: "active",
        location: "DC-02"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe("Backup Server B-9");
  });
});
