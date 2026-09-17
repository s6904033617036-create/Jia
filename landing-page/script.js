/* ============================================================
   script.js — ใช้ร่วมกันทุกหน้า (product.html, order.html, admin.html)
   ------------------------------------------------------------
   ตั้งค่า URL ปลายทาง 2 จุดด้านล่างนี้ก่อนใช้งานจริง:
   - APPS_SCRIPT_URL : URL ของ Google Apps Script Web App (สำหรับส่งออเดอร์)
   - CSV_URL         : URL ของ Google Sheet ที่ publish เป็น CSV (สำหรับหน้า admin)

   หมายเหตุโครงสร้างไฟล์ products.json ที่ใช้ (key "ลาย" ใช้ชื่อภาษาไทยตรงกับ
   URL parameter ?ลาย=xxx, ค่าจะมีจุดต่อท้ายหรือไม่ก็ได้ เพราะโค้ดตัดจุดออกก่อนเทียบ):
   [
     {
       "name": "กระเป๋าผ้าลายมังกร",
       "size": "20 นิ้ว",
       "price": 553,
       "image": "images/Dragon.jfif",
       "ลาย": "มังกร"   // ค่าที่เป็นไปได้: มังกร / ไม้เรื้อย / ตาราง / มจพ (หรือ "มจพ.")
     },
     ...
   ]
============================================================ */

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-AXMl87ZKNbrwQZwOzebS8AU3QpQTcbEi6JcsSEteyH6HD5a1wn525ULK9x9bmZ6A/exec";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5_QVYrj_K9LoE0pJzJXM6eigbPdYmtVYPwUyDSFE4Z9DckdK54_7FTnMrpkycqSYpTJndK-Tf0VlH/pub?gid=0&single=true&output=csv";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) {
    initProductPage();
  }
  if (document.getElementById("orderForm")) {
    initOrderPage();
  }
  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
});

/* ============================================================
   1) product.html — โหลดสินค้า, การ์ด, ปุ่มกรองตามลาย
============================================================ */

function initProductPage() {
  const PATTERNS = ["ทั้งหมด", "มังกร", "ไม้เรื้อย", "ตาราง", "มจพ"];
  const filterBar = document.getElementById("filter-bar");
  const productList = document.getElementById("product-list");

  let allProducts = [];

  // อ่านค่า ?ลาย=xxx จาก URL (ถ้ามี ใช้เป็นตัวกรองเริ่มต้น)
  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("ลาย") || "ทั้งหมด";
  if (!PATTERNS.includes(currentFilter)) {
    currentFilter = "ทั้งหมด";
  }

  // สร้างปุ่มกรอง
  function renderFilterBar() {
    filterBar.innerHTML = "";
    PATTERNS.forEach((pattern) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pattern;
      btn.className = "filter-btn" + (pattern === currentFilter ? " active" : "");
      btn.dataset.pattern = pattern;
      btn.addEventListener("click", () => {
        currentFilter = pattern;
        updateActiveButton();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function updateActiveButton() {
    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.pattern === currentFilter);
    });
  }

  // ตัดจุดท้าย/ช่องว่างออกก่อนเทียบ เพื่อกัน "มจพ" ไม่ตรงกับ "มจพ." ใน products.json
  function normalizePattern(str) {
    return (str || "").trim().replace(/\.$/, "");
  }

  // แสดงการ์ดสินค้าตามตัวกรองปัจจุบัน
  function renderProducts() {
    productList.innerHTML = "";

    const filtered =
      currentFilter === "ทั้งหมด"
        ? allProducts
        : allProducts.filter(
            (p) => normalizePattern(p["ลาย"]) === normalizePattern(currentFilter)
          );

    if (filtered.length === 0) {
      productList.innerHTML = "<p>ไม่พบสินค้าในหมวดนี้</p>";
      return;
    }

    filtered.forEach((product) => {
      productList.appendChild(createProductCard(product));
    });
  }

  function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.name;
    card.appendChild(img);

    const name = document.createElement("h3");
    name.textContent = product.name;
    card.appendChild(name);

    const size = document.createElement("p");
    size.textContent = "ไซส์: " + product.size;
    card.appendChild(size);

    const price = document.createElement("p");
    price.textContent = "ราคา: " + product.price + " บาท";
    card.appendChild(price);

    const orderBtn = document.createElement("a");
    const itemLabel = product.name + " ขนาด " + product.size;
    const params = new URLSearchParams({
      item: itemLabel,
      price: product.price,
    });
    orderBtn.href = "order.html?" + params.toString();
    orderBtn.className = "order-btn";
    orderBtn.textContent = "สั่งซื้อ";
    card.appendChild(orderBtn);

    return card;
  }

  // โหลดข้อมูลสินค้า
  fetch("products.json")
    .then((res) => res.json())
    .then((data) => {
      allProducts = data;
      renderFilterBar();
      renderProducts();
    })
    .catch((error) => {
      console.error(error);
      productList.innerHTML = "<p>ไม่สามารถโหลดข้อมูลสินค้าได้</p>";
    });
}

/* ============================================================
   2) order.html — เติมฟอร์มจาก URL parameter และส่งออเดอร์
============================================================ */

function initOrderPage() {
  const form = document.getElementById("orderForm");
  const itemsField = document.getElementById("items");
  const totalField = document.getElementById("total");
  const customerNameField = document.getElementById("customerName");
  const contactField = document.getElementById("contact");
  const noteField = document.getElementById("note");

  // เติมค่าจาก URL parameter ทันทีที่โหลดหน้า
  const urlParams = new URLSearchParams(window.location.search);
  const item = urlParams.get("item");
  const price = urlParams.get("price");

  if (item && itemsField) {
    itemsField.value = item;
  }
  if (price && totalField) {
    totalField.value = price;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: customerNameField.value,
      contact: contactField.value,
      items: itemsField.value,
      total: totalField.value,
      note: noteField.value,
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  });
}

/* ============================================================
   3) admin.html — โหลด CSV, parse เอง, แสดงตาราง (ล่าสุดก่อน)
============================================================ */

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");

  fetch(CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) return;

      // แถวแรกถือเป็น header ตัดออก
      const dataRows = rows.slice(1).filter((r) => r.length > 1 || r[0] !== "");

      // เรียงล่าสุดขึ้นก่อน (กลับลำดับแถวที่เพิ่มเข้ามาตามเวลา)
      dataRows.reverse();

      tbody.innerHTML = "";
      dataRows.forEach((row) => {
        const tr = document.createElement("tr");
        // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        for (let i = 0; i < 6; i++) {
          const td = document.createElement("td");
          td.textContent = row[i] !== undefined ? row[i] : "";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = "<tr><td colspan='6'>ไม่สามารถโหลดข้อมูลได้</td></tr>";
    });
}

// CSV parser เขียนเอง รองรับ field ที่ครอบด้วย " และมีจุลภาค/บรรทัดใหม่อยู่ข้างใน
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char === "\r") {
        // ข้าม \r (รองรับ \r\n)
      } else {
        field += char;
      }
    }
  }

  // เก็บ field/row สุดท้ายถ้ายังไม่ได้ push (กรณีไฟล์ไม่มี \n ปิดท้าย)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
