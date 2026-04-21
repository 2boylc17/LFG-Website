import { useEffect, useState } from "react";

export default function useSearchPagination(items, pageSize = 6, delay = 300) {
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchTerm);
			setCurrentPage(1);
		}, delay);
		return () => clearTimeout(timer);
	}, [searchTerm, delay]);

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