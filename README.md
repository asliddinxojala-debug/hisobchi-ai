# HISOBCHI AI 5.0 — shaxsiy moliyaviy yordamchi

HTML + CSS + vanilla JavaScript, localStorage. Server va API kalit yo'q. Ishga tushirish: papkani `https://` hostingga joylang (GitHub Pages, Netlify) yoki `http://localhost` (VS Code → Live Server) orqali oching.

## 5.0 yangiliklari
- **Xush kelibsiz ekrani + Demo ma'lumot**: bo'sh ilovada «✨ Demo ma'lumot bilan ko'rish» tugmasi 6 oylik namunaviy daromad, xarajat, qarz, eslatma, byudjet va maqsadlarni yuklaydi. Oldingi ma'lumot zaxiraga olinadi va «Sozlamalar»dan qaytariladi.
- **💰 Byudjet limitlari**: har bir xarajat kategoriyasi uchun oylik limit. Jarayon chizig'i (80% da sariq, 100% da qizil), oyning bugungi kuni belgisi, «oy tezligidan oldinda» ogohlantirishi, kunlik sarf imkoni, limitsiz xarajatlar ro'yxati. Bosh sahifada va AI tavsiyalarida ogohlantirish chiqadi.
- **AI chat kengaydi**: «Telefon uchun 5 mln jamg'armoqchiman, 1-iyungacha» → jamg'arma maqsadi; «Oziq-ovqatga oyiga 2 mln limit qo'y» → byudjet limiti; «Byudjetim qanday?» → holat. Yetishmagan ma'lumotni so'raydi, saqlashdan oldin tasdiq oladi.
- **📲 PWA**: `manifest.webmanifest` va ikonkalar — telefonga ilova sifatida o'rnatiladi. Service Worker fayllarni keshlaydi — **internetsiz ham ochiladi**. Tezkor havolalar: `?p=ai`, `?p=an`, `?p=bud`.
- **💾 Zaxira nusxa**: JSON yuklab olish/tiklash (boshqa qurilmaga ko'chirish), Excel uchun CSV eksport. 20+ yozuv bo'lsa va 30 kundan beri nusxa olinmagan bo'lsa, eslatadi.
- **🔍 Qidiruv va filtr**: Daromad/Xarajat ro'yxatlarida izoh, kategoriya, summa bo'yicha qidiruv, oy va kategoriya filtri.
- **⚙ Sozlamalar** sahifasi, oflayn holat belgisi, favicon, meta/OG teglar.
- Ma'lumot tuzilmasi `v:5` (`budgets` qo'shildi). 4.0 ma'lumotlari avtomatik ko'chiriladi, nusxa `hisobchi-v2-v4-backup` kalitida.

---
# 4.0 hujjati
## 4.0 yangiliklari
- **Tahlil sahifasi** (📊): har oy uchun avtomatik tahlil, oyni ‹ › bilan almashtirish mumkin. Kartalar: jami daromad, jami xarajat, sof farq, jamg'arilgan summa. Eng ko'p xarajat kategoriyasi, eng katta xarajat, oldingi oy bilan taqqoslash (summa va %), kategoriyalar grafigi (har biri o'tgan oyga nisbatan), oxirgi 6 oy grafigi. Oyda ma'lumot bo'lmasa, «tahlil mavjud emas» deydi; o'tgan oy bo'lmasa, taqqoslamaydi.
- **AI tavsiyalar**: faqat shu oy va o'tgan oy ma'lumotidan: kategoriya xarajati ≥20% oshgan bo'lsa, bitta kategoriya ulushi ≥40% bo'lsa, daromaddan ortgan summa bo'lsa (10% faqat «masalan» sifatida), keyingi oyni rejalashtirish. Kamida 3 ta xarajat bo'lmasa, tavsiya bermaydi. Va'da va qo'rqituvchi so'zlar yo'q.
- **Jamg'arma maqsadlari** (🎯): nomi, kerakli summa, hozirgacha yig'ilgan (ixtiyoriy), muddat (ixtiyoriy), izoh. Summa qo'shish (＋), oxirgi qo'shimchani bekor qilish (↺), tahrirlash, o'chirish. Jarayon chizig'i va reja: muddat bo'lsa, oyiga qancha ajratish kerakligi; muddat bo'lmasa va ma'lumot yetarli bo'lsa, taxminiy vaqt (taxmin deb belgilangan). Qo'shilgan summalar balansdan ayirilmaydi, maqsadlar alohida kuzatiladi.
- **Keyingi oy taxmini**: oxirgi to'liq oylar (kamida 2 ta) bo'yicha daromad/xarajat/sof farq **oralig'i**. Bu o'tgan ma'lumotdan chiqarilgan taxmin, kafolat emas.
- **AI chat**: «Maqsadlarim qanday?» kabi savollarga javob beradi.
- «Jamg'arilgan summa» = shu oyda maqsadlarga qo'shilgan summa (maqsadlarda jami summa alohida ko'rsatiladi).

## Cheklovlar (4.0)
- AI chat orqali jamg'arma maqsadi yaratish hozircha yo'q; maqsad «+ Maqsad» tugmasi bilan qo'shiladi.
- Tavsiyalar qoidalarga asoslangan (til modeli emas), chegaralari (20%, 40%) oddiy qoidalar.
- Taxmin kam ma'lumotda noaniq; 2 oydan kam ma'lumot bo'lsa ko'rsatilmaydi.

## Eski ma'lumotlar
3.0 ma'lumotlari birinchi ochilishda 4.0 ga ko'chiriladi (`goals` qo'shiladi, hech narsa o'chirilmaydi). Nusxa `hisobchi-v2-v3-backup` kalitida saqlanadi.

---
# Oldingi versiyalar (3.0 hujjati)

HTML + CSS + vanilla JavaScript. Ma'lumotlar faqat shu brauzerning localStorage xotirasida. Server va API kalit yo'q.

## Ishga tushirish
1. ZIP ni oching, papkani saqlang.
2. Eng yaxshisi `http://localhost` orqali oching (VS Code → Live Server) yoki `https://` hostingga joylang. `index.html` ni to'g'ridan-to'g'ri ochsangiz (`file://`) asosiy funksiyalar ishlaydi, lekin Service Worker, ovoz va bildirishnoma bloklanishi mumkin.

## 3.0 yangiliklari
- **Smart eslatma**: nomi, miqdor (ixtiyoriy), sana, vaqt, izoh, turi (qarz qaytarish, qarz olish, kommunal, internet/telefon, obuna, rejalashtirilgan xarajat, shaxsiy vazifa), takrorlanish (bir marta / har kuni / har hafta / har oy). Qo'shish, tahrirlash, o'chirish, bajarildi deb belgilash.
- **AI orqali yaratish**: «10-dekabr kuni do'stimga bergan qarzimni eslat», «Har oyning 15-sanasida internet uchun 100 ming so'm to'lashimni eslat», «Ertaga soat 9:00 da telefon to'lovimni eslat». Avval tasdiqlash kartasi chiqadi; tasdiqlamaguncha saqlanmaydi. Sana yetishmasa, savol beradi (taxmin qilmaydi).
- **Eslatmalar markazi**: kalendar (oy bo'yicha, kunni bosib ko'rish) va bo'limlar: muddati o'tgan, bugungi, ertangi, kelgusi, bajarilgan.
- **AI tahlili**: faqat saqlangan eslatma va qarzlardan («Ertaga ...», «3 kundan keyin ...», «Bugun bajarilmagan N ta eslatma»).
- **Dashboard**: bugungi, yaqinlashayotgan to'lovlar (7 kun, miqdori bor), muddati o'tgan, bajarilgan bloklari.
- **Bildirishnoma**: ruxsat so'raladi; berilmasa yoki ishlamasa, ilova ichida xabar va Dashboard ogohlantirishi ko'rinadi. Har eslatma har bir vaqt uchun bir marta yuboriladi, bajarilganlari yuborilmaydi.
- 1.0 va 2.0 imkoniyatlari (daromad/xarajat/qarz, AI chat, tasdiqlash, ovoz, tavsiyalar) saqlangan.

## Muhim cheklov: yopiq brauzerda eslatma ISHLAMAYDI
Eslatma tekshiruvi sahifa ichidagi taymer (har 30 soniya) va sahifaga qaytganda ishlaydi. Shuning uchun:
- Sahifa/brauzer yopiq yoki telefon ekrani uzoq o'chiq bo'lsa, bildirishnoma o'z vaqtida chiqmaydi. Ilovani ochganingizda o'tib ketgan eslatmalar (oxirgi 24 soat) chiqadi, eskilari «Muddati o'tgan» bo'limida ko'rinadi.
- `sw.js` (Service Worker) bildirishnomani ishonchliroq ko'rsatadi (ayniqsa Android Chrome) va bosilganda ilovani ochadi, lekin **o'zi vaqti kelganda uyg'onib eslatma yubormaydi**. Service Worker faqat `https://` yoki `localhost` da ishlaydi.
- Haqiqiy fon (background) eslatma uchun **server va Web Push** kerak: server eslatmalarni saqlaydi, vaqti kelganda push xizmati (VAPID kalitlari bilan) qurilmaga yuboradi, Service Worker `push` hodisasida bildirishnomani ko'rsatadi. iPhone'da Web Push faqat ilova «Bosh ekranga qo'shilgan» bo'lsa ishlaydi. Bu keyingi bosqich (backend).
- Vaqt ko'rsatilmagan eslatmalar mahalliy vaqt bilan 09:00 da eslatiladi.

## Eslatma qoidalari
- Takrorlanuvchi eslatma «bajarildi» bosilganda keyingi sanaga o'tadi (kun/hafta/oy; oy oxiri kunlari moslashtiriladi, masalan 31 → 28). Alohida «bajarilganlar tarixi» saqlanmaydi.
- Kalendarda takrorlanuvchi eslatma faqat keyingi sanasida ko'rinadi.
- Muddati o'tgan = sanasi o'tgan, yoki bugun va vaqti o'tgan, va bajarilmagan.

## Eski ma'lumotlar
2.0 ma'lumotlari birinchi ochilishda 3.0 tuzilmasiga ko'chiriladi (yangi maydonlar standart qiymat bilan to'ldiriladi, hech narsa o'chirilmaydi). Ko'chirishdan oldin nusxa `hisobchi-v2-v2-backup` kalitida saqlanadi. 1.0 ma'lumotlari ham o'z vaqtida ko'chirilgan.

## Boshqa cheklovlar
Parser qoidalarga asoslangan (haqiqiy til modeli emas); tasdiqlash kartasini tekshiring. Ovoz: o'zbek tilini hamma qurilma tanimaydi. Qurilmalar o'rtasida sinxronlash yo'q.
