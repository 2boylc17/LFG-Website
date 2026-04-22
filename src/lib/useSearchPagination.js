import { useEffect, useState } from "react";

/**
 * Custom hook that combines debounced search and pagination for a list of items.
 * @param {Array} items - The full list of items (used implicitly by callers via paginate).
 * @param {number} pageSize - Number of items per page (default: 6).
 * @param {number} delay - Debounce delay in milliseconds before applying the search term (default: 300).
 * @returns searchTerm, setSearchTerm, debouncedSearch, setCurrentPage, and a paginate helper.
 */
export default function useSearchPagination(items, pageSize = 6, delay = 300) {
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	// Debounce the search term: updates debouncedSearch and resets to page 1 after the delay.
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchTerm);
			setCurrentPage(1);
		}, delay);
		return () => clearTimeout(timer);
	}, [searchTerm, delay]);

	// Slices a pre-filtered list into the current page and returns pagination metadata.
	const paginate = (filteredItems) => {
		const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
		const safePage = Math.min(currentPage, totalPages);
		const pagedItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);
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