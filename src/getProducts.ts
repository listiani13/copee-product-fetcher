import { sampleData } from "./fixtures/products";
import { Parser } from "json2csv";
import * as fs from "fs";
import fetch from "node-fetch";
import process from "process";
import path from "path";

type BuildShopDetailsUrlParam = {
	limit: number;
	offset: number;
	shopId: number;
};

/**
 * Per 11 November 2022, if we fetch over 100, it will
 * only return 20 items.
 */
const LIMIT_PER_FETCH = 100;
function buildShopDetailsUrl({
	limit = LIMIT_PER_FETCH,
	offset,
	shopId,
}: BuildShopDetailsUrlParam) {
	return `https://shopee.co.id/api/v4/recommend/recommend?bundle=shop_page_category_tab_main&item_card=2&limit=${limit}&offset=${offset}&section=shop_page_category_tab_main_sec&shopid=${shopId}&sort_type=1&step2_upstream=search&tab_name=popular&upstream=pdp`;
}

function formatShopeePrice(price: number): number {
	return price / 100000;
}

export async function fetchShopProduct(
	shopId: number,
	offset = 0
): Promise<typeof sampleData> {
	const res = await fetch(
		buildShopDetailsUrl({ limit: LIMIT_PER_FETCH, offset, shopId }),
		{
			headers: {
				"X-Shopee-Language": "id",
			},
			method: "GET",
		}
	);
	const data = await res.json();
	// TODO Better to use parser for the incoming data
	return data as typeof sampleData;
}

async function getAllProducts(shopId: number) {
	// Fetching first time to get the count of all products
	const initialFetchedData = await fetchShopProduct(shopId);
	const currentResult = initialFetchedData.data.sections?.[0].data.item;
	const totalAllProducts = initialFetchedData.data.sections?.[0].total;

	if (totalAllProducts > currentResult.length) {
		let allProducts = [...currentResult];
		const fetchCount = Math.ceil(totalAllProducts / LIMIT_PER_FETCH) - 1;
		for (let index = 0; index < fetchCount; index++) {
			const page = index + 1;
			const fetchResult = await fetchShopProduct(
				shopId,
				page * LIMIT_PER_FETCH
			);
			const res = fetchResult.data.sections?.[0].data.item;
			allProducts = [...allProducts, ...res];
		}
		return allProducts;
	}
	return currentResult;
}

const ALPHANUMERIC_REGEX = /[^0-9a-z]/gi;
function buildShopeeProductUrl({
	name,
	shopId,
	itemId,
}: {
	name: string;
	shopId: number;
	itemId: number;
}) {
	return `https://shopee.co.id/${name
		.replace(ALPHANUMERIC_REGEX, "")
		.replaceAll(" ", "-")}-i.${shopId}.${itemId}`;
}

export async function storeProductsToCsvFile(shopId: number, fileName: string) {
	console.log("Fetching for shopId:", shopId);
	const allProducts = await getAllProducts(shopId);
	console.log("Fetching completed for shopId: ", shopId);
	const productItems = allProducts.map(
		({
			name,
			stock,
			price_before_discount,
			price_max_before_discount,
			price_min_before_discount,
			price,
			price_max,
			price_min,
			shopid,
			itemid,
			tier_variations,
			sold,
			historical_sold,
		}) => ({
			name: `"${name}"`,
			is_discount: price_before_discount !== price,
			price: formatShopeePrice(price),
			price_before_discount:
				price_before_discount < 0
					? "N/A"
					: formatShopeePrice(price_before_discount),
			stock,
			product_link: buildShopeeProductUrl({
				name,
				shopId: shopid,
				itemId: itemid,
			}),
			price_max: formatShopeePrice(price_max),
			price_min: formatShopeePrice(price_min),
			price_max_before_discount: formatShopeePrice(price_max_before_discount),
			price_min_before_discount: formatShopeePrice(price_min_before_discount),
			sold,
			historical_sold,
			tier_variations: `"${tier_variations.join(",")}"`,
		})
	);

	const json2csvParser = new Parser();
	const csv = json2csvParser.parse(productItems);
	const currentWorkingDirectory = process.cwd();
	const cwdPath = path.join(currentWorkingDirectory, `${fileName}.csv`);
	console.log("Writing result to CSV");
	await fs.writeFile(cwdPath, csv, (err) => {
		if (err) {
			console.error("Error occured while writing the file", err);
		} else {
			console.log("Finish writing result to", cwdPath);
		}
	});
}
