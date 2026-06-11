# The MongolZ-тэй зургаа татуул 📸

Хэрэглэгч зургаа оруулахад AI (Google Gemini) ашиглан The MongolZ-ийн тоглогчидтой хамт зургаа татуулсан мэт бодит зураг үүсгэдэг вебсайт.

## Ажиллуулах заавар

### 1. Gemini API key авах

[Google AI Studio](https://aistudio.google.com/apikey) руу орж үнэгүй API key үүсгэнэ.

### 2. Орчны тохиргоо

```bash
cp .env.example .env.local
```

`.env.local` файл доторх `GEMINI_API_KEY`-д өөрийн key-г оруулна.

### 3. Тоглогчдын зургийг нэмэх

`public/players/` хавтсанд тоглогч бүрийн зургийг нэмнэ:

- `blitz.jpg`, `techno.jpg`, `mzinho.jpg`, `910.jpg`, `cobrazera.jpg`

Дэлгэрэнгүйг `public/players/README.md`-ээс үзнэ үү.

### 4. Ажиллуулах

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) дээр нээгдэнэ.

## Хэрхэн ажилладаг вэ

### AI горим (1 тоглогч + 1 дэмжигч)

1. Хэрэглэгч зургаа upload хийгээд **нэг** тоглогч сонгоно
2. Backend нь хэрэглэгчийн зураг + тоглогчийн reference зураг + prompt-ийг Gemini-ийн image model руу илгээнэ
3. AI хоёр хүний царайг хадгалан хамт зогсож зургаа татуулсан мэт зураг үүсгэнэ
4. **Gemini ажиллахгүй бол** (quota, key г.м.) автоматаар локал хувилбар руу шилжинэ: хоёр хүний фоныг хасаад тайзны фон дээр зэрэгцүүлж угсарна. `IMAGINE_API_KEY` тохируулсан бол фоныг [ImagineArt API](https://www.imagine.art/gen-api)-аар үүсгэнэ, үгүй бол өөрөө зурсан тайз ашиглана — тиймээс AI горим хэзээ ч бүтэлгүйтэхгүй.

## Технологи

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Google Gemini API](https://ai.google.dev/) — `gemini-2.5-flash-image` model
- Rate limiting: IP тутамд цагт 10 хүсэлт (in-memory)

## Анхаарах зүйлс

- Энэ бол fan project — The MongolZ байгууллагатай албан ёсны холбоогүй. Арилжааны зорилгоор ашиглах бол тоглогчдын зөвшөөрөл шаардлагатай.
- Gemini API нь зураг тутамд төлбөртэй тул production орчинд бодит rate limiting (Upstash Redis г.м.) нэмэхийг зөвлөж байна.
- Хэрэглэгчийн оруулсан зургийг сервер дээр хадгалдаггүй — зөвхөн AI руу дамжуулаад л болоо.
# Mongolz
