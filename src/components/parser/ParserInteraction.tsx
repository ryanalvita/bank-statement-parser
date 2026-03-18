import { useRef, useState, type ChangeEvent } from "react";
import { extractPdfText } from "../../lib/pdf/extractPdfText";
import { runAbnAmroPipelineFromExtraction } from "../../lib/pipeline/abnAmroPipeline";
import type { Transaction } from "../../lib/models/transaction";

const MESSAGE_NON_TEXT = "Non-text PDF detected";

type BankOption = {
	id: string;
	name: string;
	logo: string;
	enabled: boolean;
};

const BANK_OPTIONS: BankOption[] = [
	{
		id: "abn-amro",
		name: "ABN AMRO",
		logo: "/bank-statement-parser/images/abn_amro_logo.svg",
		enabled: true,
	},
	{
		id: "ing",
		name: "ING",
		logo: "/bank-statement-parser/images/ing_logo.svg",
		enabled: false,
	},
	{
		id: "rabobank",
		name: "Rabobank",
		logo: "/bank-statement-parser/images/rabobank_logo.svg",
		enabled: false,
	},
	{
		id: "asn-bank",
		name: "ASN Bank",
		logo: "/bank-statement-parser/images/asn_logo.svg",
		enabled: false,
	},
	{
		id: "bunq",
		name: "bunq",
		logo: "/bank-statement-parser/images/bunq_logo.svg",
		enabled: false,
	},
];

export default function ParserInteraction() {
	const [selectedBank, setSelectedBank] = useState(BANK_OPTIONS[0].id);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [extractedPages, setExtractedPages] = useState<string[]>([]);
	const [error, setError] = useState("");
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [tsvOutput, setTsvOutput] = useState("");
	const [copyStatus, setCopyStatus] = useState("");
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const activeBank =
		BANK_OPTIONS.find((bank) => bank.id === selectedBank) ?? BANK_OPTIONS[0];

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		setSelectedFile(file);

		setExtractedPages([]);
		setTransactions([]);
		setTsvOutput("");
		setError("");
		setCopyStatus("");

		if (!file) {
			return;
		}

		try {
			const result = await extractPdfText(file);
			setExtractedPages(result.pages);

			const hasText = result.pages.some(
				(pageText) => pageText.trim().length > 0
			);

			if (!hasText) {
				setError(MESSAGE_NON_TEXT);
				return;
			}

			const pipelineResult = runAbnAmroPipelineFromExtraction(result);
			setTransactions(pipelineResult.transactions);
			setTsvOutput(pipelineResult.tsvOutput);
			setError(pipelineResult.error);
			setCopyStatus("");
		} catch {
			setError("Failed to extract text from PDF. Please try another file.");
			setCopyStatus("");
		}
	};

	const handleCopyTsv = async () => {
		if (!tsvOutput) {
			return;
		}

		try {
			await navigator.clipboard.writeText(tsvOutput);
			setCopyStatus("TSV copied to clipboard.");
			setError("");
		} catch {
			setCopyStatus("");
			setError("Unable to copy TSV to clipboard.");
		}
	};

	const handleReset = () => {
		setSelectedFile(null);
		setExtractedPages([]);
		setTransactions([]);
		setTsvOutput("");
		setError("");
		setCopyStatus("");

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
			<div>
				<h2 className="text-base font-semibold text-gray-900">
					1. Choose Your Bank
				</h2>
			</div>

			<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
				{BANK_OPTIONS.map((bank) => {
					const isSelected = bank.id === selectedBank;
					const disabledClasses = bank.enabled
						? "cursor-pointer"
						: "cursor-not-allowed opacity-70";

					return (
						<button
							key={bank.id}
							type="button"
							disabled={!bank.enabled}
							onClick={() => setSelectedBank(bank.id)}
							className={`relative rounded-lg border px-3 py-2 text-left transition-colors ${disabledClasses} ${
								isSelected
									? "border-black bg-gray-50"
									: "border-gray-200 bg-white hover:border-gray-300"
							}`}
						>
							<div className="flex items-center justify-center">
								<img
									src={bank.logo}
									alt={`${bank.name} logo`}
									className="h-5 w-auto object-contain"
									loading="lazy"
								/>
							</div>
							{!bank.enabled ? (
								<span className="absolute -top-2 right-2 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium leading-none text-gray-600 whitespace-nowrap">
									📋 In the backlog
								</span>
							) : null}
						</button>
					);
				})}
			</div>

			<div className="mt-4">
				<h2 className="text-base font-semibold text-gray-900">
					2. Upload Statement
				</h2>
				<p className="mt-1 text-sm text-gray-600">
					Upload a PDF file. The file will stay in your browser and never
					submitted.
				</p>

				<input
					ref={fileInputRef}
					type="file"
					accept="application/pdf,.pdf"
					multiple={false}
					onChange={handleFileChange}
					disabled={!activeBank.enabled}
					className="mt-3 block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1 file:text-sm disabled:cursor-not-allowed disabled:opacity-60"
				/>
			</div>

			{error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

			<div className="mt-4 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={handleCopyTsv}
					disabled={!tsvOutput}
					className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Copy TSV
				</button>
				<button
					type="button"
					onClick={handleReset}
					className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
				>
					Reset
				</button>
			</div>

			{copyStatus ? (
				<p className="mt-2 text-sm text-green-700">{copyStatus}</p>
			) : null}

			{transactions.length > 0 ? (
				<section className="mt-6">
					<h3 className="text-sm font-medium text-gray-900">
						Parsed Transactions
					</h3>
					<div className="mt-2 overflow-x-auto rounded border border-gray-300">
						<table className="min-w-full border-collapse text-left text-sm">
							<thead className="bg-gray-100 text-gray-800">
								<tr>
									<th className="border-b border-gray-300 px-3 py-2">Date</th>
									<th className="border-b border-gray-300 px-3 py-2">Time</th>
									<th className="border-b border-gray-300 px-3 py-2">
										Description
									</th>
									<th className="border-b border-gray-300 px-3 py-2">
										Category
									</th>
									<th className="border-b border-gray-300 px-3 py-2">
										Outcome
									</th>
									<th className="border-b border-gray-300 px-3 py-2">Income</th>
								</tr>
							</thead>
							<tbody>
								{transactions.map((transaction, index) => (
									<tr
										key={`${transaction.date}-${transaction.description}-${index}`}
										className="odd:bg-white even:bg-gray-50"
									>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.date}
										</td>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.time}
										</td>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.description}
										</td>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.category}
										</td>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.outcome}
										</td>
										<td className="border-b border-gray-200 px-3 py-2">
											{transaction.income}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}
		</section>
	);
}
