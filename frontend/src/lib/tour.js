import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Ikon SVG sederhana untuk mempercantik judul popover
const icons = {
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  list: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
};

export function startTour() {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: "rgba(2, 6, 23, 1)", // slate-950 dengan opacity
    stagePadding: 8,
    stageRadius: 10,
    nextBtnText:
      'Lanjut <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-left:4px; margin-bottom:-2px"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>',
    prevBtnText:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px; margin-bottom:-2px"><path d="m15 18-6-6 6-6"></path></svg> Kembali',
    doneBtnText: "Mulai Sekarang",
    popoverClass: "driver-premium-theme",

    steps: [
        {
          element: "#tour-task-list",
          popover: {
            title: `<div style="display:flex; align-items:center; gap:8px;">${icons.list} <span>Daftar Prioritas</span></div>`,
            description:
              "Tugas Anda diurutkan secara otomatis berdasarkan skor prioritas. Tugas yang paling kritis akan selalu berada di paling atas.",
            side: "top",
            align: "start",
          },
        },
      {
        element: "#tour-add-task",
        popover: {
          title: `<div style="display:flex; align-items:center; gap:8px;">${icons.plus} <span>Tambah Tugas</span></div>`,
          description:
            "Klik tombol ini untuk mencatat tugas baru atau agenda dengan waktu tetap (seperti rapat).",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: "#tour-timeline",
        popover: {
          title: `<div style="display:flex; align-items:center; gap:8px;">${icons.calendar} <span>Timeline Anda</span></div>`,
          description:
            "Hasil jadwal akan muncul di sini. Anda bisa membandingkan jadwal baru dan lama sebelum menyetujuinya.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-overdue-toggle",
        popover: {
          title: `<div style="display:flex; align-items:center; gap:8px;">${icons.clock} <span>Tugas Terlambat</span></div>`,
          description:
            "Centang kotak ini jika Anda memiliki tugas yang sudah lewat deadline dan ingin AI mencarikan jadwal barunya.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-generate-btn",
        popover: {
          title: `<div style="display:flex; align-items:center; gap:8px;">${icons.sparkles} <span>Jadwalkan AI</span></div>`,
          description:
            "Klik tombol ini agar AI menyusun timeline untuk Anda. AI akan menghindari jam tidur dan agenda tetap Anda.",
          side: "bottom",
          align: "end",
        },
      },
    ],
  });

  driverObj.drive();
}
