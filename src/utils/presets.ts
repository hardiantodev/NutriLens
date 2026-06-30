/**
 * Utility to draw mock nutritional labels onto a canvas
 * and return the base64 jpeg data URL.
 */
export function drawPresetLabel(type: "susu_manis" | "keripik_asin" | "susu_sehat"): string {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Draw solid white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 400, 300);

  // 2. Draw thick black outer border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 380, 280);

  // 3. Draw "INFORMASI NILAI GIZI" header
  ctx.fillStyle = "#000000";
  ctx.font = "bold 20px 'Courier New', Courier, monospace";
  ctx.fillText("INFORMASI NILAI GIZI", 30, 42);
  
  ctx.font = "12px sans-serif";
  ctx.fillText("Takaran Saji / Serving Size: 100g", 30, 64);

  // Thick divider line
  ctx.fillStyle = "#000000";
  ctx.fillRect(20, 74, 360, 5);

  if (type === "susu_manis") {
    // High sugar and cholesterol
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("PRODUK: Susu Kental Manis Enak", 30, 105);
    
    ctx.font = "13px sans-serif";
    ctx.fillText("Energi Total / Total Calories: 340 kkal", 30, 130);
    ctx.fillText("Lemak Jenuh / Saturated Fat: 8 g", 30, 155);
    ctx.fillText("Kolesterol / Cholesterol: 25 mg", 30, 180);
    ctx.fillText("Natrium (Garam) / Sodium: 120 mg", 30, 205);
    
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Gula / Sugar: 43 g", 30, 235);
    
  } else if (type === "keripik_asin") {
    // High Salt and Fat
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("PRODUK: Keripik Kentang Gurih", 30, 105);
    
    ctx.font = "13px sans-serif";
    ctx.fillText("Energi Total / Total Calories: 520 kkal", 30, 130);
    ctx.fillText("Lemak Jenuh / Saturated Fat: 14 g", 30, 155);
    ctx.fillText("Kolesterol / Cholesterol: 45 mg", 30, 180);
    
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Natrium (Garam) / Sodium: 850 mg", 30, 210);
    
    ctx.font = "13px sans-serif";
    ctx.fillText("Gula / Sugar: 1.5 g", 30, 235);
    
  } else {
    // Low Sugar, low cholesterol, healthy oat milk
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("PRODUK: Susu Gandum Organik", 30, 105);
    
    ctx.font = "13px sans-serif";
    ctx.fillText("Energi Total / Total Calories: 45 kkal", 30, 130);
    ctx.fillText("Lemak Jenuh / Saturated Fat: 0.2 g", 30, 155);
    ctx.fillText("Kolesterol / Cholesterol: 0 mg", 30, 180);
    ctx.fillText("Natrium (Garam) / Sodium: 25 mg", 30, 205);
    
    ctx.font = "bold 15px sans-serif";
    ctx.fillText("Gula / Sugar: 1.2 g", 30, 235);
  }

  // Thin line at bottom
  ctx.fillStyle = "#000000";
  ctx.fillRect(20, 260, 360, 2);

  ctx.font = "italic 11px sans-serif";
  ctx.fillText("*Persen AKG berdasarkan kebutuhan energi 2150 kkal", 30, 278);

  return canvas.toDataURL("image/jpeg");
}
