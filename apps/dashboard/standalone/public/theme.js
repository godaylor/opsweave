try {
	const theme =
		localStorage.getItem("opsweave.theme.v2") === "light" ? "light" : "dark";
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", theme === "light" ? "#f2f5fb" : "#0a101d");
} catch {
	document.documentElement.dataset.theme = "dark";
}
