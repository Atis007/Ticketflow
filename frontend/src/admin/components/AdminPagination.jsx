import { AdminButton } from "./AdminButton";

export function AdminPagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    if (currentPage <= 3) {
      for (let i = 1; i <= 5; i += 1) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);
    pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
      pages.push(i);
    }
    pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-6 py-4">
      <div className="text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">
        {totalItems && itemsPerPage ? (
          <span>
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <AdminButton
          variant="ghost"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<span className="material-symbols-outlined text-base">chevron_left</span>}
          iconPosition="left"
        >
          Previous
        </AdminButton>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            typeof page === "number" ? (
              <button
                key={`${page}-${index}`}
                onClick={() => onPageChange(page)}
                className={`rounded-[var(--admin-radius-md)] px-3 py-1.5 text-[var(--admin-text-small)] font-medium transition-colors duration-[var(--admin-transition-fast)] ${page === currentPage ? "bg-[var(--admin-interactive-primary)] text-white" : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]"}`}
              >
                {page}
              </button>
            ) : (
              <span key={`${page}-${index}`} className="px-2 text-[var(--admin-text-muted)]">
                {page}
              </span>
            ),
          )}
        </div>

        <AdminButton
          variant="ghost"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={<span className="material-symbols-outlined text-base">chevron_right</span>}
          iconPosition="right"
        >
          Next
        </AdminButton>
      </div>
    </div>
  );
}
