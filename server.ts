import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy-loaded GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 image uploads from cameras
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API endpoint for nutritional label analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { image, restrictions } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Foto label makanan belum diunggah atau tidak terbaca." });
      }

      // Initialize Gemini API client safely
      const ai = getAiClient();

      // Clean the base64 prefix if present
      let base64Data = image;
      let mimeType = "image/jpeg";

      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      // Compile current restrictions into a friendly prompt context
      const restrictionText = Array.isArray(restrictions) && restrictions.length > 0
        ? restrictions.map(r => {
            switch (r) {
              case "diabetes": return "- DIABETES (Kencing Manis): Sangat sensitif terhadap gula tinggi, karbohidrat sederhana, sirup jagung, sukrosa, dan pemanis buatan.";
              case "cholesterol": return "- KOLESTEROL TINGGI: Sangat sensitif terhadap kolesterol tinggi, lemak jenuh (saturated fat), lemak trans, minyak sawit minyak goreng, dan mentega.";
              case "hypertension": return "- DARAH TINGGI (Hipertensi): Sangat sensitif terhadap kadar Garam/Natrium/Sodium yang tinggi, pengawet makanan asin, MSG.";
              case "gout": return "- ASAM URAT (Gout): Sensitif terhadap makanan tinggi purin, jeroan, ragi, beberapa jenis kacang, ekstrak daging.";
              default: return `- ${r.toUpperCase()}`;
            }
          }).join("\n")
        : "- UMUM (Menjaga Kesehatan Lansia secara umum: kurangi gula pasir berlebih, lemak jenuh, dan garam berlebih)";

      const systemInstruction = `Anda adalah "NutriLens", seorang asisten kecerdasan buatan sekaligus Dokter Spesialis Gizi Klinik di Indonesia yang sangat ramah, sopan, dan hangat. Tugas utama Anda adalah membantu kakek, nenek, dan para lansia Indonesia saat berbelanja di supermarket agar terhindar dari makanan berbahaya yang dilarang dokter mereka.

Karakteristik Komunikasi Anda:
1. Panggil pengguna dengan sebutan hormat dan penuh kasih sayang: "Kakek", "Nenek", "Bapak", atau "Ibu".
2. Gunakan bahasa Indonesia yang sederhana, santun, tidak memakai istilah medis yang membingungkan tanpa penjelasan sederhana.
3. Berikan penilaian warna yang tegas untuk produk secara keseluruhan berdasarkan label nutrisi:
   - MERAH (BAHAYA / HINDARI!): Jika ada zat gizi yang melebihi batas aman penderita penyakit yang dipilih.
   - KUNING (BATASI / WASPADA): Jika kandungannya sedang atau perlu diawasi ketat.
   - HIJAU (AMAN / BAIK): Jika kandungannya sangat aman dan baik dikonsumsi.
4. Tulis rekomendasi praktis belanja yang mudah diikuti, seperti menyarankan alternatif yang lebih sehat (misal: "Lebih baik pilih susu almond tawar atau air putih saja ya, Kek").
5. Sediakan "speechText" yang mengalir seperti sedang berbicara langsung dengan suara yang tenang, lambat, ramah, dan jelas.`;

      const prompt = `Analisis foto label nutrisi atau produk makanan ini.
Kondisi kesehatan/pantangan medis pengguna saat ini adalah:
${restrictionText}

Mohon baca informasi tabel nilai gizi pada gambar (seperti Gula/Sugar, Garam/Natrium/Sodium, Kolesterol/Cholesterol, Lemak Jenuh/Saturated Fat, Kalori, Lemak Trans) lalu berikan evaluasi lengkap sesuai dengan format JSON yang diminta.

PENTING:
Jika kualitas gambar buram atau tidak ada label nilai gizi yang terdeteksi, gunakan kecerdasan Anda untuk mengidentifikasi produk berdasarkan teks kemasan atau merek yang terbaca pada gambar, lalu berikan perkiraan nilai nutrisi rata-rata produk tersebut agar lansia tetap terbantu secara aman.`;

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: prompt }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: {
                type: Type.STRING,
                description: "Nama merek atau jenis produk makanan/minuman yang diidentifikasi dari gambar. Jika tidak terlihat jelas, tulis perkiraan terbaik (misal: 'Susu Bubuk Cokelat')."
              },
              status: {
                type: Type.STRING,
                description: "Status kelayakan produk keseluruhan untuk lansia dengan pantangan medis tersebut. Harus bernilai salah satu dari: AMAN, BATASI, BAHAYA."
              },
              color: {
                type: Type.STRING,
                description: "Warna yang cocok dengan status. Pilih salah satu dari: hijau (jika AMAN), kuning (jika BATASI), merah (jika BAHAYA)."
              },
              reason: {
                type: Type.STRING,
                description: "Penjelasan singkat, ramah, dan langsung pada intinya dalam bahasa Indonesia mengapa produk ini mendapatkan status tersebut (misalnya: 'Kandungan gula mencapai 18 gram per sajian, ini terlalu tinggi untuk Nenek yang memiliki diabetes')."
              },
              nutrients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Nama nutrisi dalam bahasa Indonesia yang relevan (misal: Gula, Garam (Natrium), Kolesterol, Lemak Jenuh, Kalori)."
                    },
                    value: {
                      type: Type.STRING,
                      description: "Nilai kandungan yang tertera pada kemasan (misal: '12 gram', '450 miligram', '0 mg')."
                    },
                    evaluation: {
                      type: Type.STRING,
                      description: "Evaluasi singkat terhadap kandungan tersebut (misal: 'Sangat Tinggi', 'Aman / Rendah', 'Sedang / Batasi')."
                    },
                    status: {
                      type: Type.STRING,
                      description: "Warna indikator nutrisi tersebut: HIJAU (aman), KUNING (sedang), MERAH (bahaya)."
                    }
                  },
                  required: ["name", "value", "evaluation", "status"]
                },
                description: "Daftar nutrisi penting yang ditemukan di gambar dan status keamanannya."
              },
              recommendation: {
                type: Type.STRING,
                description: "Saran belanja taktis atau rekomendasi produk sejenis yang lebih aman untuk lansia dalam bahasa Indonesia."
              },
              speechText: {
                type: Type.STRING,
                description: "Teks asisten suara bahasa Indonesia yang ramah dan lambat untuk dibacakan keras-keras kepada lansia melalui text-to-speech."
              }
            },
            required: ["productName", "status", "color", "reason", "nutrients", "recommendation", "speechText"]
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gagal menerima analisis gizi dari Gemini.");
      }

      const result = JSON.parse(responseText.trim());
      return res.json(result);

    } catch (error: any) {
      console.error("Error during analysis:", error);
      return res.status(500).json({
        error: error.message || "Terjadi kesalahan internal saat membaca label nutrisi. Mohon coba lagi."
      });
    }
  });

  // Serve static files in production or hook up Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Smart Grocery Reader Server] Server berjalan di port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server:", err);
});
