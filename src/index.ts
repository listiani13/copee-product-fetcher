import { Command } from "commander";
import { storeProductsToCsvFile } from "./getProducts";

const program = new Command();

program
	// TODO: Get from package.json
	.version("1.0.0")
	.description("CLI to get list of products from store in Shopee")
	.argument("<shopId>", "Shopee's Shop ID")
	.argument("<fileName>", "Name of output file")
	.command("get-product <shopId> <fileName>")
	.description("Retrieve list of product of store in Shopee")
	.action(async (shopId: string, fileName: string) => {
		if (Number.isNaN(shopId)) {
			console.error("shopId consists of number");
			return;
		}
		await storeProductsToCsvFile(Number(shopId), fileName);
	})
	.parse(process.argv);
