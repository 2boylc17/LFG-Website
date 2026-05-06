import { useEffect, useState } from "react";

// Search & pagination hook with debounce
export default function useSearchPagination(items, pageSize = 6, delay = 300) {
	// Search input & debounced value
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);

	// Debounce search & reset page
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchTerm);
			setCurrentPage(1);
		}, delay);
		return () => clearTimeout(timer);
	}, [searchTerm, delay]);

	// Calculate pagination info
	const paginate = (itemsToPage) => {
		const totalPages = Math.max(1, Math.ceil(itemsToPage.length / pageSize));
		const safePage = Math.min(currentPage, totalPages);
		const pagedItems = itemsToPage.slice((safePage - 1) * pageSize, safePage * pageSize);
		return { totalPages, safePage, pagedItems };
	};

	return {
		searchTerm,
		setSearchTerm,
		debouncedSearch,
		setCurrentPage,
		paginate
	};
}