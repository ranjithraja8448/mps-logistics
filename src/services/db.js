export const local = {
  async get(k) {
    try {
      const r = window.localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch (err) {
      console.warn(`Local storage read error for key "${k}":`, err);
      return null;
    }
  },
  async set(k, v) {
    try {
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch (err) {
      console.warn(`Local storage write error for key "${k}":`, err);
    }
  }
};

// 🔥 ENHANCED DB CLASS - Handles Detailed Errors & Offline Fallbacks 🔥
export class DB {
  constructor(url, key) {
    this.isLive = Boolean(url && key);
    if (this.isLive) {
      this.base = url.replace(/\/+$/, "") + "/rest/v1";
      this.h = {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      };
    }
  }

  async getParcels() {
    if (this.isLive) {
      try {
        const r = await fetch(`${this.base}/parcels?select=*&limit=10000`, { headers: this.h, cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (err) {
        console.warn("Fetch parcels offline fallback:", err);
      }
    }
    return (await local.get("mps_parcels")) || [];
  }

  async insertParcel(p) {
    if (this.isLive) {
      const r = await fetch(`${this.base}/parcels`, { method: "POST", headers: this.h, body: JSON.stringify(p) });
      if (!r.ok) {
        const errText = await r.text();
        let cleanError = errText;
        try {
          const j = JSON.parse(errText);
          cleanError = j.message || j.details || errText;
        } catch {
          // Keep raw text if not valid JSON
        }
        throw new Error(cleanError); // Passing clean JSON error to UI
      }
    }
    await local.set("mps_parcels", [p, ...((await local.get("mps_parcels")) || [])]);
  }

  async updateParcel(id, data) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/parcels?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: this.h,
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.warn(`Update parcel ${id} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_parcels",
      ((await local.get("mps_parcels")) || []).map(x => (x.id === id ? { ...x, ...data } : x))
    );
  }

  async deleteParcel(id) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/parcels?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: this.h });
      } catch (err) {
        console.warn(`Delete parcel ${id} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_parcels",
      ((await local.get("mps_parcels")) || []).filter(x => x.id !== id)
    );
  }

  async getUsers() {
    if (this.isLive) {
      try {
        const r = await fetch(`${this.base}/app_users?select=*`, { headers: this.h, cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (err) {
        console.warn("Fetch users offline fallback:", err);
      }
    }
    let usrs = await local.get("mps_users");
    if (!usrs || usrs.length === 0) {
      usrs = [
        { id: "super-1", username: "superadmin", password: "123", role: "superadmin", branch: "All" },
        { id: "admin-1", username: "admin", password: "123", role: "admin", branch: "Mecheri" },
        { id: "staff-1", username: "staff", password: "123", role: "staff", branch: "Mecheri" }
      ];
      await local.set("mps_users", usrs);
    } else if (!usrs.find(u => u.username === "superadmin")) {
      usrs.push({ id: "super-1", username: "superadmin", password: "123", role: "superadmin", branch: "All" });
      await local.set("mps_users", usrs);
    }
    return usrs;
  }

  async insertUser(u) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/app_users`, { method: "POST", headers: this.h, body: JSON.stringify(u) });
      } catch (err) {
        console.warn("Insert user offline fallback:", err);
      }
    }
    await local.set("mps_users", [u, ...(await this.getUsers())]);
  }

  async deleteUser(id) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/app_users?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: this.h });
      } catch (err) {
        console.warn(`Delete user ${id} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_users",
      (await this.getUsers()).filter(u => u.id !== id)
    );
  }

  async updateUser(id, data) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/app_users?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: this.h,
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.warn(`Update user ${id} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_users",
      (await this.getUsers()).map(u => (u.id === id ? { ...u, ...data } : u))
    );
  }

  async getCreditAuth() {
    if (this.isLive) {
      try {
        const r = await fetch(`${this.base}/credit_auth?select=*`, { headers: this.h, cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (err) {
        console.warn("Fetch credit_auth offline fallback:", err);
      }
    }
    return (await local.get("mps_credit_auth")) || [];
  }

  async insertCreditAuth(data) {
    if (this.isLive) {
      try {
        await fetch(`${this.base}/credit_auth`, { method: "POST", headers: this.h, body: JSON.stringify(data) });
      } catch (err) {
        console.warn("Insert credit_auth offline fallback:", err);
      }
    }
    await local.set("mps_credit_auth", [data, ...((await local.get("mps_credit_auth")) || [])]);
  }

  async updateCreditAuth(phone, company, data) {
    if (this.isLive) {
      try {
        await fetch(
          `${this.base}/credit_auth?phone=eq.${encodeURIComponent(phone)}&company=eq.${encodeURIComponent(company)}`,
          { method: "PATCH", headers: this.h, body: JSON.stringify(data) }
        );
      } catch (err) {
        console.warn(`Update credit_auth ${company} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_credit_auth",
      ((await local.get("mps_credit_auth")) || []).map(c =>
        c.phone === phone && c.company === company ? { ...c, ...data } : c
      )
    );
  }

  async deleteCreditAuth(phone, company) {
    if (this.isLive) {
      try {
        await fetch(
          `${this.base}/credit_auth?phone=eq.${encodeURIComponent(phone)}&company=eq.${encodeURIComponent(company)}`,
          { method: "DELETE", headers: this.h }
        );
      } catch (err) {
        console.warn(`Delete credit_auth ${company} offline fallback:`, err);
      }
    }
    await local.set(
      "mps_credit_auth",
      ((await local.get("mps_credit_auth")) || []).filter(c => !(c.phone === phone && c.company === company))
    );
  }
}
