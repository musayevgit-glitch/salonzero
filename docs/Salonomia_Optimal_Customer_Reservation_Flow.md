# Salonomia — Optimal Customer Reservation Flow

## Məqsəd

Bu sənəd müştərinin salon siyahısından başlayaraq uğurlu rezervasiya yaratmasına qədər ən məntiqli, rahat və təhlükəsiz flow-u müəyyən edir.

Əsas ardıcıllıq:

```text
Salon discovery
→ Salon profile
→ Service selection
→ Stylist preference
→ Date and time
→ Booking summary
→ Login or registration
→ Final confirmation
→ Booking result
```

---

# 1. Salon Discovery

İstifadəçi sayta daxil olduqda aktiv salonların siyahısını görür.

Hər salon kartında göstərilir:

- salon adı;
- əsas şəkil;
- ünvan və məsafə;
- reytinq və rəy sayı;
- əsas xidmət kateqoriyaları;
- başlanğıc qiymət;
- bu gün açıq və ya bağlı statusu;
- ən yaxın boş vaxt;
- “Salona bax” düyməsi.

Filterlər:

- məkan;
- xidmət;
- qiymət aralığı;
- reytinq;
- mövcud tarix;
- qadın, kişi və ya uniseks salon;
- açıq olan salonlar;
- ən yaxın boş vaxt.

Sort seçimləri:

- ən uyğun;
- ən yaxın;
- ən yüksək reytinq;
- ən aşağı qiymət;
- ən yaxın boş vaxt.

## UX qaydaları

- İstifadəçi login olmadan salonları görə bilməlidir.
- Filterlər mobil cihazda drawer və ya bottom sheet daxilində açılmalıdır.
- Filter nəticələri dəyişəndə istifadəçinin scroll mövqeyi qorunmalıdır.
- Boş nəticə zamanı alternativ filter təklifləri göstərilməlidir.

---

# 2. Salon Profile

İstifadəçi salonu seçdikdə salon profilinə keçir.

Salon profilində göstərilir:

- salon adı və şəkilləri;
- ünvan və xəritə;
- əlaqə məlumatları;
- iş saatları;
- salon haqqında məlumat;
- xidmət kateqoriyaları;
- xidmətlər və qiymətlər;
- stilistlər;
- stilist portfolio-ları;
- reytinq və rəylər;
- salonun rezervasiya və ləğv qaydaları;
- “Rezervasiya et” düyməsi.

## UX qaydaları

- Mobil cihazda “Rezervasiya et” düyməsi aşağıda sticky ola bilər.
- Xidmət seçilmədən tarix və saat seçiminə keçilməməlidir.
- Qiymət “başlayır” tipindədirsə bu açıq göstərilməlidir.
- Salon timezone-u istifadəçiyə aydın göstərilməlidir.

---

# 3. Service Selection

İstifadəçi rezervasiya etmək istədiyi xidməti seçir.

Hər xidmət üçün göstərilir:

- xidmət adı;
- qısa təsvir;
- qiymət;
- müddət;
- əlavə buffer vaxtı varsa məlumat;
- xidməti göstərən stilistlər;
- aktiv və ya əlçatmaz status.

## Qaydalar

- Yalnız aktiv xidmətlər rezervasiya edilə bilər.
- Qiymət və müddət client tərəfindən göndərilsə belə server onları qəbul etməməlidir.
- Server xidmətin real qiymətini və müddətini database-dən götürməlidir.
- Bir rezervasiyada birdən çox xidmət MVP-də dəstəklənmirsə, bu açıq şəkildə məhdudlaşdırılmalıdır.

## Validation

- `serviceId` tələb olunur.
- Xidmət seçilən salona aid olmalıdır.
- Xidmət aktiv olmalıdır.
- Xidmət rezervasiya vaxtında mövcud olmalıdır.

---

# 4. Stylist Preference

İstifadəçi iki seçimdən birini seçir:

## Variant A — Konkret stilist

İstifadəçi müəyyən stilisti seçir.

Göstərilir:

- stilist adı;
- şəkil;
- ixtisas;
- reytinq;
- portfolio;
- seçilən xidmət üzrə uyğunluğu;
- ən yaxın boş vaxt.

## Variant B — Fərqi yoxdur

İstifadəçi “Ən uyğun boş stilist” seçimini edir.

Sistem seçilən xidmət üçün:

- xidməti yerinə yetirə bilən;
- həmin tarixdə işləyən;
- boş slotu olan;
- aktiv;
- uyğun salona aid

stilistlərdən birini rezervasiya zamanı server tərəfində seçir.

## UX qaydaları

- “Fərqi yoxdur” seçimi default və rahat görünməlidir.
- İstifadəçi konkret stilist seçməyə məcbur edilməməlidir.
- Stilist seçildikdə yalnız həmin stilistin slotları göstərilməlidir.
- “Fərqi yoxdur” seçildikdə bütün uyğun stilistlərin ümumi boş slotları göstərilməlidir.

## Təhlükəsizlik

- Client tərəfindən göndərilən `employeeId` serverdə salon və xidmət ilə yoxlanmalıdır.
- Stilist həmin salona aid olmalıdır.
- Stilist aktiv olmalıdır.
- Stilist seçilən xidməti göstərə bilməlidir.

---

# 5. Date and Time Selection

İstifadəçi tarix və boş vaxt seçir.

Göstərilir:

- uyğun günlər;
- boş slotlar;
- salon timezone-u;
- seçilən xidmətin müddəti;
- seçilən stilist və ya “ən uyğun stilist”;
- əlçatmaz gün və saatların izahı.

## Availability hesablanarkən nəzərə alınır

- salonun timezone-u;
- salonun iş saatları;
- stilistin iş qrafiki;
- fasilələr;
- məzuniyyət və time-off;
- salonun bağlı günləri;
- xidmət müddəti;
- buffer vaxtı;
- mövcud rezervasiyalar;
- minimum qabaqcadan rezervasiya müddəti;
- maksimum gələcək rezervasiya intervalı;
- xidmət və stilist uyğunluğu.

## UX qaydaları

- Keçmiş tarixlər seçilə bilməz.
- Boş olmayan saatlar disabled olmalıdır.
- Mobil cihazda slotlar rahat touch ölçüsündə göstərilməlidir.
- Saat seçildikdə rezervasiya xülasəsi dərhal yenilənməlidir.
- Slotlar seçilən salonun timezone-u ilə göstərilməlidir.

## Təhlükəsizlik

Frontend availability yalnız preview-dur.

Final rezervasiya yaradılarkən server:

1. xidməti yenidən yoxlayır;
2. stilisti yenidən yoxlayır;
3. slotu yenidən hesablayır;
4. transaction daxilində conflict yoxlaması edir;
5. yalnız bundan sonra rezervasiyanı yaradır.

---

# 6. Booking Summary

Login mərhələsindən əvvəl istifadəçiyə tam xülasə göstərilir.

Xülasədə:

- salon;
- ünvan;
- xidmət;
- stilist və ya “ən uyğun stilist”;
- tarix;
- saat;
- timezone;
- müddət;
- qiymət;
- əlavə ödəniş varsa məlumat;
- ləğv və reschedule qaydası;
- rezervasiya statusunun necə yaranacağı.

## UX qaydaları

- Xülasə bütün mərhələlərdə desktop-da sidebar, mobile-da collapsible card kimi görünə bilər.
- İstifadəçi əvvəlki addımlara qayıdıb seçimini dəyişə bilməlidir.
- Geri qayıdanda digər seçimlər mümkün qədər qorunmalıdır.
- Qiymət final deyilsə “təxmini qiymət” açıq yazılmalıdır.

---

# 7. Login or Registration

İstifadəçi hələ login olmayıbsa yalnız bu mərhələdə authentication tələb olunur.

Seçimlər:

- login;
- yeni hesab yaratmaq;
- Google və ya başqa təsdiqlənmiş provider ilə giriş;
- təsdiqlənmiş guest booking yalnız məhsul qərarı ilə.

## Əsas UX prinsipi

İstifadəçi authentication-dan sonra rezervasiya seçimlərini itirməməlidir.

Saxlanmalı məlumatlar:

- salon;
- xidmət;
- stilist seçimi;
- tarix;
- saat;
- rezervasiya xülasəsi.

## Təhlükəsizlik

- Redirect yalnız allowlist edilmiş daxili route-a olmalıdır.
- Authentication məlumatları URL-də saxlanmamalıdır.
- Reservation draft daxilində qiymət, tenant və user identity etibarlı mənbə sayılmamalıdır.
- Customer identity session-dan götürülməlidir.

---

# 8. Final Confirmation Form

Login-dən sonra istifadəçi final formu görür.

Form field-ləri:

- ad və soyad — profildən;
- telefon nömrəsi;
- optional customer note;
- salon qaydalarının qəbul checkbox-u;
- marketing checkbox-u ayrıca və optional;
- final “Rezervasiya et” düyməsi.

## Validation

### Ad və soyad

- required;
- trim;
- minimum və maksimum uzunluq;
- yalnız boşluqdan ibarət ola bilməz.

### Telefon

- required;
- server-side normalize;
- qəbul edilən region və format açıq müəyyən edilir;
- çox uzun və ya qısa nömrələr rədd edilir.

### Customer note

- optional;
- trim;
- maksimum uzunluq;
- HTML qəbul edilmir;
- output zamanı escape edilir.

### Terms acceptance

- required;
- marketing consent ilə birləşdirilə bilməz.

## UX qaydaları

- Submit zamanı düymə disable edilir.
- Double-click duplicate rezervasiya yaratmamalıdır.
- Validation xətaları field-in yanında göstərilir.
- Server conflict xətasında seçimlər itmir.
- İstifadəçi slotu dəyişmək üçün availability mərhələsinə qaytarılır.

---

# 9. Server-Side Booking Creation

Final submit zamanı backend aşağıdakı ardıcıllığı icra edir:

1. Session-dan customer identity-ni götürür.
2. Request schema-nı validate edir.
3. Salonun aktiv olduğunu yoxlayır.
4. Xidmətin salona aid və aktiv olduğunu yoxlayır.
5. Stilist seçilibsə salon və xidmət uyğunluğunu yoxlayır.
6. “Fərqi yoxdur” seçilibsə uyğun stilistləri server özü müəyyən edir.
7. Salon booking policy-ni oxuyur.
8. Qiymət və müddəti server database-dən götürür.
9. Slotu yenidən hesablayır.
10. Transaction başladır.
11. Eyni vaxt üçün conflict-i yenidən yoxlayır.
12. Uyğun stilisti lock və ya təhlükəsiz concurrency strategiyası ilə seçir.
13. Rezervasiyanı yaradır.
14. İlkin status tarixçəsini yaradır.
15. Audit və notification event yaradır.
16. Transaction-u commit edir.
17. Təhlükəsiz response qaytarır.

## Client-in müəyyən edə bilmədiyi field-lər

Client bunları etibarlı şəkildə təyin edə bilməz:

- `customerId`;
- `salonId` authorization scope kimi;
- final price;
- service duration;
- protected reservation status;
- discount;
- employee eligibility;
- tenant ownership;
- audit actor;
- createdAt;
- completedAt.

---

# 10. Reservation Initial Status

Salon booking policy-dən asılı olaraq rezervasiya iki formada yarana bilər.

## Auto-confirm salon

```text
CONFIRMED
```

Bu yalnız:

- slot təhlükəsiz şəkildə ayrıldıqda;
- əlavə manual approval tələb olunmadıqda;
- salon policy auto-confirm etdikdə

istifadə olunur.

## Manual approval salon

```text
PENDING
```

Salon Manager və ya Salon Admin rezervasiyanı:

- confirm;
- reject;
- reschedule təklifi;
- cancel

edə bilər.

Customer-a status aydın göstərilməlidir:

- “Rezervasiyanız təsdiqləndi”
- və ya “Rezervasiya salon təsdiqi gözləyir”

---

# 11. Success Page

Uğurlu rezervasiyadan sonra göstərilir:

- rezervasiya nömrəsi;
- salon;
- xidmət;
- stilist;
- tarix və saat;
- timezone;
- status;
- qiymət;
- salon ünvanı;
- ləğv və reschedule qaydası;
- “Rezervasiyalarıma bax” düyməsi;
- calendar-a əlavə etmə seçimi;
- notification məlumatı.

## Təhlükəsizlik

- Reservation ID URL-dən dəyişdirilərsə başqa müştərinin məlumatı görünməməlidir.
- Success page customer ownership yoxlaması etməlidir.
- Private reservation response public cache-ə düşməməlidir.

---

# 12. Error and Conflict Flow

## Slot artıq tutulubsa

Mesaj:

```text
Seçdiyiniz saat artıq əlçatan deyil.
Məlumatlarınız qorundu. Zəhmət olmasa başqa vaxt seçin.
```

Sistem:

- istifadəçini availability mərhələsinə qaytarır;
- salon və xidmət seçimini qoruyur;
- yeni slotları yükləyir;
- private booking məlumatı göstərmir.

## Salon və ya xidmət deaktiv edilibsə

- rezervasiya yaradılmır;
- aydın error state göstərilir;
- istifadəçiyə salon profilinə və ya axtarışa qayıtmaq imkanı verilir.

## Network və ya server xətası

- duplicate submission-dan qorunur;
- istifadəçinin form məlumatları qorunur;
- retry düyməsi göstərilir;
- rezervasiyanın yaranıb-yaranmadığı idempotency ilə müəyyən olunur.

---

# 13. Customer Reservation Management

Customer profilində:

- upcoming reservations;
- pending reservations;
- completed reservations;
- cancelled reservations;
- reservation details;
- eligible cancellation;
- eligible rescheduling.

Customer yalnız:

- öz rezervasiyalarını görə bilər;
- salon policy icazə verirsə ləğv edə bilər;
- salon policy icazə verirsə reschedule edə bilər.

Customer:

- statusu birbaşa `CONFIRMED` və ya `COMPLETED` edə bilməz;
- başqa customer rezervasiyasını görə bilməz;
- price və service duration dəyişə bilməz;
- salon qeydlərini görə bilməz.

---

# 14. Recommended Mobile Flow

Mobil ardıcıllıq:

```text
Salon list
→ Salon details
→ Select service
→ Choose stylist preference
→ Select date
→ Select time
→ Review summary
→ Login/register
→ Confirm booking
→ Success
```

Mobil UI:

- bir addım bir ekran;
- sticky continue button;
- sticky və ya collapsible booking summary;
- back action seçimləri qoruyur;
- progress indicator;
- 44px ətrafında touch target;
- date və slotlar horizontal overflow yaratmır;
- keyboard açıldıqda submit düyməsi itmir.

---

# 15. Recommended Desktop Flow

Desktop-da:

- əsas content solda;
- booking summary sağ sidebar-da;
- mərhələlər stepper ilə göstərilir;
- salon, xidmət, stilist və slot dəyişdikcə summary yenilənir;
- final mərhələdə bütün məlumatlar bir baxışda görünür.

Desktop flow mobile flow-dan funksional olaraq fərqli olmamalıdır.

---

# 16. Final Acceptance Criteria

Flow hazır sayılır yalnız bunlar keçərsə:

- istifadəçi login olmadan salonları görə bilir;
- xidmət seçə bilir;
- konkret stilist və ya “fərqi yoxdur” seçə bilir;
- yalnız real boş slotlar göstərilir;
- login sonrası seçimlər qorunur;
- server qiyməti və müddəti özü hesablayır;
- customer identity session-dan götürülür;
- wrong salon və wrong employee request-ləri rədd edilir;
- duplicate submit duplicate booking yaratmır;
- eyni slot üçün iki paralel request-dən yalnız biri uğurlu olur;
- başqa customer rezervasiyasına ID dəyişməklə giriş mümkün deyil;
- mobile və desktop flow problemsiz işləyir;
- validation, loading, empty, error və success state-ləri mövcuddur;
- keyboard və basic accessibility testləri keçir;
- rezervasiya uyğun olaraq `PENDING` və ya `CONFIRMED` yaranır;
- notification və status history yaradılır.

---

# Claude Code Implementation Prompt

```text
Read:
- CLAUDE.md;
- the approved product specification;
- the approved authentication and authorization documents;
- the approved reservation state model;
- docs/product/customer-reservation-flow.md.

Implement the customer reservation flow exactly as documented.

Required sequence:
Salon discovery
→ Salon profile
→ Service selection
→ Stylist preference
→ Date and time
→ Booking summary
→ Login or registration
→ Final confirmation
→ Booking result.

Apply:
- responsive-ui;
- validation-contract;
- reservation-integrity;
- secure-feature;
- test-gate.

Critical requirements:
- login happens after the user selects salon, service, stylist preference, date, and time;
- preserve the booking draft after authentication;
- support a specific stylist or “any suitable stylist”;
- never trust price, duration, customer identity, tenant scope, status, or availability from the client;
- recalculate and re-check availability inside the final transaction;
- prevent double booking under concurrent requests;
- customer can only access their own reservations;
- mobile-first UI with complete loading, empty, error, conflict, success, and permission-denied states;
- no unrelated refactoring.

Before implementation:
1. map the flow to routes, components, API endpoints, schemas, and database operations;
2. define authorization and validation rules;
3. define the concurrency strategy;
4. define Playwright journeys for mobile and desktop;
5. propose a file-level plan.

Do not implement until the plan is complete.

Required tests:
- public salon discovery;
- service selection;
- specific stylist;
- any suitable stylist;
- no available slots;
- login with preserved draft;
- registration with preserved draft;
- invalid service;
- employee from another salon;
- inactive employee or service;
- manipulated price and duration;
- malformed fields;
- double submit;
- simultaneous booking conflict;
- customer ownership;
- cancellation and rescheduling policy;
- 375px mobile journey;
- 1440px desktop journey;
- keyboard accessibility smoke test.

After implementation return only:
1. result;
2. files changed;
3. tests and exact outcomes;
4. authorization and validation checks;
5. concurrency result;
6. remaining risks.
```
