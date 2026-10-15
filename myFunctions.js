/* myFunctions.js - جميع التوابع البرمجية للموقع في ملف واحد */

var MS_PER_DAY = 24 * 60 * 60 * 1000;
var DISCOUNT_AFTER_DAYS = 7;   // الخصم عند تجاوز هذه المدة
var DISCOUNT_PERCENT = 10;     // نسبة الخصم %

/* ---------- توابع مساعدة ---------- */

// تحويل الأرقام العربية الهندية (٠-٩) إلى أرقام لاتينية
function normalizeDigits(text) {
  var arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  var result = "";
  for (var i = 0; i < text.length; i++) {
    var pos = arabicDigits.indexOf(text.charAt(i));
    if (pos >= 0) {
      result += pos;
    } else {
      result += text.charAt(i);
    }
  }
  return result;
}

// تنسيق الأرقام مع فواصل الآلاف
function formatMoney(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* ---------- توابع التحقق (تعيد نص الخطأ أو سلسلة فارغة عند النجاح) ---------- */

// الاسم الكامل: أحرف عربية فقط، كلمتان على الأقل، والحقل اختياري
function checkName(value) {
  if (value === "") {
    return "";
  }
  var cleaned = value.replace(/\s+/g, " ");
  var pattern = /^[ء-غف-ي]+( [ء-غف-ي]+)+$/;
  if (!pattern.test(cleaned)) {
    return "الاسم يجب أن يتألف من أحرف عربية فقط (اسم وكنية على الأقل).";
  }
  return "";
}

// الرقم الوطني: إلزامي، 11 خانة، أول خانتين من 01 إلى 14
function checkNationalId(value) {
  if (value === "") {
    return "الرقم الوطني إلزامي.";
  }
  if (!/^\d{11}$/.test(value)) {
    return "الرقم الوطني يجب أن يتألف من 11 رقماً بالضبط.";
  }
  var province = parseInt(value.substring(0, 2), 10);
  if (province < 1 || province > 14) {
    return "أول خانتين يجب أن تدلّا على المحافظة (من 01 إلى 14).";
  }
  return "";
}

// تحويل نص التاريخ إلى كائن Date (يقبل yyyy-mm-dd و dd-mm-yyyy)، أو null إن كان غير صالح
function parseDate(text) {
  var y, m, d;
  var match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    y = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    d = parseInt(match[3], 10);
  } else {
    match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text);
    if (!match) {
      return null;
    }
    d = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    y = parseInt(match[3], 10);
  }
  var date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null; // مثل 2026-02-31
  }
  return date;
}

function checkDate(value, label) {
  if (value === "") {
    return label + " إلزامي.";
  }
  if (parseDate(value) === null) {
    return "صيغة التاريخ غير صحيحة، استخدم yyyy-mm-dd وتاريخاً حقيقياً.";
  }
  return "";
}

// رقم الموبايل: Syriatel (093، 098، 099) أو MTN (094، 095، 096)، والحقل اختياري
function checkMobile(value) {
  if (value === "") {
    return "";
  }
  var cleaned = value.replace(/[\s\-]/g, "");
  var pattern = /^(?:0|\+963|00963)9[345689]\d{7}$/;
  if (!pattern.test(cleaned)) {
    return "الرقم لا يطابق شبكتي Syriatel (093/098/099) أو MTN (094/095/096).";
  }
  return "";
}

// البريد الإلكتروني: اختياري
function checkEmail(value) {
  if (value === "") {
    return "";
  }
  var pattern = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
  if (!pattern.test(value)) {
    return "البريد الإلكتروني غير صالح.";
  }
  return "";
}

/* ---------- عرض الأخطاء ---------- */

function showError(fieldId, message) {
  $("#err-" + fieldId).text(message);
  if (message === "") {
    $("#" + fieldId).removeClass("invalid");
  } else {
    $("#" + fieldId).addClass("invalid");
  }
}

function clearErrors() {
  var fields = ["fullName", "nationalId", "startDate", "endDate", "mobile", "email"];
  for (var i = 0; i < fields.length; i++) {
    showError(fields[i], "");
  }
}

/* ---------- السيارات المختارة ---------- */

// قراءة السيارات المحددة من الجدول (الرمز، الموديل، السعر اليومي)
function getSelectedCars() {
  var cars = [];
  $("#carsTable input.pick:checked").each(function () {
    var row = $(this).closest("tr");
    cars.push({
      code: $(this).val(),
      model: $.trim(row.find("td").eq(2).text()),
      price: parseInt(row.find("span.price").text(), 10)
    });
  });
  return cars;
}

function refreshChosenList() {
  var cars = getSelectedCars();
  var list = $("#chosenList");
  list.empty();
  for (var i = 0; i < cars.length; i++) {
    list.append($("<li></li>").text(cars[i].code + " - " + cars[i].model + " (" + formatMoney(cars[i].price) + " ل.س / يوم)"));
  }
  return cars.length;
}

/* ---------- حساب الأجرة وعرض النتيجة ---------- */

function calculateDays(startDate, endDate) {
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function showResult(cars, days, applicantName) {
  var total = 0;
  var body = $("#resultBody");
  body.empty();

  if (applicantName !== "") {
    body.append($("<p></p>").text("مقدّم الطلب: " + applicantName));
  }

  var table = $("<table></table>");
  var header = "<tr><th>السيارة</th><th>السعر اليومي</th><th>عدد الأيام</th><th>الأجرة</th></tr>";
  table.append(header);

  for (var i = 0; i < cars.length; i++) {
    var subtotal = cars[i].price * days;
    total += subtotal;
    var row = $("<tr></tr>");
    row.append($("<td></td>").text(cars[i].code + " - " + cars[i].model));
    row.append($("<td></td>").text(formatMoney(cars[i].price) + " ل.س"));
    row.append($("<td></td>").text(days));
    row.append($("<td></td>").text(formatMoney(subtotal) + " ل.س"));
    table.append(row);
  }

  var discount = 0;
  if (days > DISCOUNT_AFTER_DAYS) {
    discount = Math.round(total * DISCOUNT_PERCENT / 100);
  }
  var finalAmount = total - discount;

  var totalRow = $('<tr class="total-row"></tr>');
  totalRow.append($('<td colspan="3"></td>').text("المجموع"));
  totalRow.append($("<td></td>").text(formatMoney(total) + " ل.س"));
  table.append(totalRow);

  var discountRow = $("<tr></tr>");
  var discountLabel = discount > 0
    ? "الخصم (" + DISCOUNT_PERCENT + "% لأن المدة تجاوزت " + DISCOUNT_AFTER_DAYS + " أيام)"
    : "الخصم (لا يوجد - المدة لا تتجاوز " + DISCOUNT_AFTER_DAYS + " أيام)";
  discountRow.append($('<td colspan="3"></td>').text(discountLabel));
  discountRow.append($("<td></td>").text(formatMoney(discount) + " ل.س"));
  table.append(discountRow);

  var finalRow = $('<tr class="final-row"></tr>');
  finalRow.append($('<td colspan="3"></td>').text("المبلغ النهائي"));
  finalRow.append($("<td></td>").text(formatMoney(finalAmount) + " ل.س"));
  table.append(finalRow);

  body.append(table);
  $("#overlay").fadeIn(250);
}

/* ---------- معالجة إرسال النموذج ---------- */

function submitBooking() {
  clearErrors();
  var ok = true;

  var cars = getSelectedCars();
  if (cars.length === 0) {
    $("#selectMsg").text("اختر سيارة واحدة على الأقل.");
    $("#bookingForm").slideUp(200);
    return false;
  }

  var name = $.trim($("#fullName").val());
  var nationalId = normalizeDigits($.trim($("#nationalId").val()));
  var startText = normalizeDigits($.trim($("#startDate").val()));
  var endText = normalizeDigits($.trim($("#endDate").val()));
  var mobile = normalizeDigits($.trim($("#mobile").val()));
  var email = $.trim($("#email").val());

  var message = checkName(name);
  showError("fullName", message);
  if (message !== "") { ok = false; }

  message = checkNationalId(nationalId);
  showError("nationalId", message);
  if (message !== "") { ok = false; }

  var startError = checkDate(startText, "تاريخ البداية");
  var endError = checkDate(endText, "تاريخ النهاية");
  showError("startDate", startError);
  showError("endDate", endError);
  if (startError !== "" || endError !== "") { ok = false; }

  var startDate = null;
  var endDate = null;
  if (startError === "" && endError === "") {
    startDate = parseDate(startText);
    endDate = parseDate(endText);
    if (endDate.getTime() <= startDate.getTime()) {
      showError("endDate", "تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.");
      ok = false;
    }
  }

  message = checkMobile(mobile);
  showError("mobile", message);
  if (message !== "") { ok = false; }

  message = checkEmail(email);
  showError("email", message);
  if (message !== "") { ok = false; }

  if (!ok) {
    return false;
  }

  var days = calculateDays(startDate, endDate);
  showResult(cars, days, name.replace(/\s+/g, " "));
  return false;
}

/* ---------- الخروج من الموقع ---------- */

function exitSite() {
  if (!window.confirm("هل تريد الخروج من الموقع؟")) {
    return false;
  }
  window.close();
  // إن لم يُغلق المتصفح النافذة نعرض رسالة وداع
  $("body").fadeOut(250, function () {
    $("body").html('<div class="goodbye"><p>شكراً لزيارتكم هبة الله لتأجير السيارات.</p><p><a href="home.html">العودة إلى الصفحة الرئيسية</a></p></div>');
    $("body").fadeIn(250);
  });
  return false;
}

/* ---------- عرض الصور المتغيّر في الصفحة الرئيسية (كل 5 ثوانٍ) ---------- */

var HERO_INTERVAL = 5000; // 5 ثوانٍ
var heroSlides = [
  { src: "images/hero-sportage.jpg", name: "Kia Sportage" },
  { src: "images/hero-corolla.jpg",  name: "Toyota Corolla" },
  { src: "images/hero-elantra.jpg",  name: "Hyundai Elantra" },
  { src: "images/hero-spark.jpg",    name: "Chevrolet Spark" },
  { src: "images/hero-swift.jpg",    name: "Suzuki Swift" }
];
var heroIndex = 0;

function showNextHero() {
  heroIndex = (heroIndex + 1) % heroSlides.length;
  var slide = heroSlides[heroIndex];
  $("#heroImg, #heroBadge").fadeOut(400, function () {
    // الدالة تُستدعى مرة لكل عنصر؛ نغيّر الصورة بعد اختفائها ثم نُظهرها
    if (this.id === "heroImg") {
      $(this).attr({ src: slide.src, alt: slide.name }).fadeIn(400);
    } else {
      $(this).text(slide.name).fadeIn(400);
    }
  });
}

function startHeroSlideshow() {
  if ($("#heroImg").length === 0) {
    return; // الصفحة لا تحتوي على الصورة الكبيرة
  }
  // تحميل باقي الصور مسبقاً حتى لا يحدث تأخير عند التبديل
  for (var i = 1; i < heroSlides.length; i++) {
    var preload = new Image();
    preload.src = heroSlides[i].src;
  }
  setInterval(showNextHero, HERO_INTERVAL);
}

/* ---------- ربط الأحداث عند تحميل الصفحة (jQuery) ---------- */

$(document).ready(function () {
  // ظهور تدريجي لمحتوى كل صفحة
  $("#content").hide().fadeIn(400);

  // الصورة الكبيرة المتغيّرة (الصفحة الرئيسية فقط)
  startHeroSlideshow();

  // رابط الخروج موجود في كل الصفحات
  $("#exitLink").click(exitSite);

  // إظهار/إخفاء تفاصيل السيارة (يمكن إظهار عدة سيارات معاً)
  $("#carsTable input.show-details").change(function () {
    var row = $("#details-" + $(this).val());
    if (this.checked) {
      row.fadeIn(200);
    } else {
      row.fadeOut(200);
    }
  });

  // الزر "متابعة": يُظهر نموذج الحجز في نفس الصفحة
  $("#continueBtn").click(function () {
    if (refreshChosenList() === 0) {
      $("#selectMsg").text("اختر سيارة واحدة على الأقل ثم اضغط متابعة.");
      return;
    }
    $("#selectMsg").text("");
    $("#bookingForm").slideDown(300, function () {
      $("html, body").animate({ scrollTop: $("#bookingForm").offset().top - 20 }, 300);
    });
  });

  // تحديث قائمة السيارات المختارة إذا تغير الاختيار والنموذج ظاهر
  $("#carsTable input.pick").change(function () {
    $("#selectMsg").text("");
    if ($("#bookingForm").is(":visible")) {
      if (refreshChosenList() === 0) {
        $("#bookingForm").slideUp(200);
      }
    }
  });

  // إرسال النموذج
  $("#bookingForm").submit(function () {
    return submitBooking();
  });

  // إغلاق نافذة النتيجة
  $("#closeModal").click(function () {
    $("#overlay").fadeOut(200);
  });
});
