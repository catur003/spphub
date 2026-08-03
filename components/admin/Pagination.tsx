"use client";

type Props = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  /** Sembunyikan seluruh kontrol ini pas print/PDF (default true) — jangan
   * biarkan tombol "Next/Prev" kepotong-potong di kertas, dan jangan bikin
   * user ngira laporan yang dicetak cuma isi 1 halaman data ini doang. */
  hideOnPrint?: boolean;
};

const btnClass =
  "rounded-control border border-border-soft bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition hover:border-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50";

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  hideOnPrint = true,
}: Props) {
  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-t border-border-soft bg-white px-5 py-3 ${
        hideOnPrint ? "print:hidden" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <span>Tampilkan</span>
        <select
          className="w-[70px] rounded-control border border-border-soft px-2 py-1 text-sm text-ink-900"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>
          dari <strong>{totalItems}</strong> data (Halaman <strong>{currentPage}</strong> dari{" "}
          <strong>{totalPages}</strong>)
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button className={btnClass} disabled={currentPage === 1} onClick={() => onPageChange(1)} title="Halaman Pertama">
          « First
        </button>
        <button
          className={btnClass}
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          ‹ Prev
        </button>

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = currentPage;
          if (currentPage <= 3) pageNum = i + 1;
          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = currentPage - 2 + i;
          if (pageNum < 1 || pageNum > totalPages) return null;

          return (
            <button
              key={pageNum}
              className={`rounded-control border px-3 py-1 text-xs font-semibold transition ${
                currentPage === pageNum
                  ? "border-accent bg-accent text-white"
                  : "border-border-soft bg-white text-ink-700 hover:border-accent hover:bg-accent-soft hover:text-accent"
              }`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          className={btnClass}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next ›
        </button>
        <button
          className={btnClass}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Halaman Terakhir"
        >
          Last »
        </button>
      </div>
    </div>
  );
}
