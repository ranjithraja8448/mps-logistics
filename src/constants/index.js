export const ENV_URL = import.meta.env.VITE_SUPABASE_URL || "https://tqhckzoemvijgwqjmkct.supabase.co";
export const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaGNrem9lbXZpamd3cWpta2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTA1MzIsImV4cCI6MjA5NDU2NjUzMn0.eJm7K_8yjdCgqbb8WZJsDIAM2VO30tBFhYassw_PF8I";

export const BRANCH_CONFIG = { 
  "Mecheri": "01", 
  "Elampillai": "02", 
  "Jalakandapuram": "03", 
  "Salem": "04", 
  "Coimbatore": "05", 
  "Bhavani": "06", 
  "Sathyamangalam": "07", 
  "Bangalore": "08", 
  "Chennai": "09", 
  "Punjai Puliyampatti": "10" 
};

export const CITIES = Object.keys(BRANCH_CONFIG);

export const TYPES = [
  "Box",
  "Wooden Box",
  "Bag",
  "Green bag",
  "Yellow Bag",
  "Bale",
  "Documents",
  "Rolle",
  "Electronics",
  "Furniture",
  "Medical",
  "Machinery",
  "Glassware",
  "Carton",
  "Others"
];

export const STATUSES = ["Booked", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "RTO", "Deleted"];

export const S_CLR = {
  "Booked": "#3B82F6",
  "Picked Up": "#F59E0B",
  "In Transit": "#F97316",
  "Out for Delivery": "#8B5CF6",
  "Delivered": "#10B981",
  "RTO": "#EF4444",
  "Deleted": "#64748B"
};

export const PAY_MODES = ["Paid", "To Pay", "Credit", "FOC"];

export const genUserId = () => `USR-${Math.floor(Math.random() * 10000)}`;
