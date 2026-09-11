import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../src/components/opsweave-standalone/product.css";
const Product = lazy(
	() => import("../src/components/opsweave-standalone/product"),
);
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true } },
});
const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
	<React.StrictMode>
		<QueryClientProvider client={client}>
			<Suspense
				fallback={
					<main className="initial-loading" aria-busy="true">
						OpsWeave…
					</main>
				}
			>
				<Product />
			</Suspense>
		</QueryClientProvider>
	</React.StrictMode>,
);
