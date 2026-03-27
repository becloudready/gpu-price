import Dashboard from "@/components/Dashboard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://freellm.org";
const dataUrl = process.env.NEXT_PUBLIC_DATA_URL ?? "https://freellm.org/latest/all.json";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "GPU Cloud Pricing",
      url: siteUrl,
      description:
        "Compare GPU rental prices across neo cloud providers in real-time. Updated nightly.",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "GPU Cloud Pricing Comparison Tool",
      url: siteUrl,
      description:
        "A real-time comparison tool for GPU cloud rental pricing across CoreWeave, RunPod, Lambda Labs, Nebius, Crusoe, Denvr and other neo cloud providers.",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Real-time GPU pricing from 10+ cloud providers",
        "Compare H100, A100, L40S, H200, B200 pricing",
        "60-day historical price charts per GPU SKU",
        "Filter by cloud provider, GPU type, and GPU count",
        "Side-by-side GPU spec and price comparison (up to 4 GPUs)",
        "Pricing data updated nightly",
        "Downloadable JSON and CSV datasets",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Developers, AI engineers, ML researchers, data scientists",
      },
    },
    {
      "@type": "Dataset",
      "@id": `${siteUrl}/#dataset`,
      name: "GPU Cloud Pricing Dataset",
      description:
        "Nightly-updated GPU rental pricing data across neo cloud providers including CoreWeave, RunPod, Lambda Labs, Nebius, Crusoe, and Denvr. Includes GPU model, VRAM, vCPU, RAM, storage, and price per hour.",
      url: dataUrl,
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: dataUrl,
        },
        {
          "@type": "DataDownload",
          encodingFormat: "text/csv",
          contentUrl: dataUrl.replace("all.json", "all.csv"),
        },
      ],
      keywords: [
        "GPU pricing", "H100", "A100", "L40S", "cloud computing",
        "CoreWeave", "RunPod", "Lambda Labs", "Nebius", "Crusoe",
        "AI training", "machine learning", "LLM", "inference",
      ],
      temporalCoverage: "2024/..",
      spatialCoverage: "Global",
      isAccessibleForFree: true,
      creator: {
        "@type": "Organization",
        name: "GPU Cloud Pricing",
        url: siteUrl,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Which cloud provider has the cheapest H100 GPU?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "H100 pricing varies daily. Our dashboard aggregates real-time pricing from CoreWeave, RunPod, Lambda Labs, Nebius, Crusoe, and more so you can instantly compare the cheapest H100 rental per hour.",
          },
        },
        {
          "@type": "Question",
          name: "How often is GPU pricing data updated?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pricing data is scraped nightly from each provider's public pricing pages and uploaded to our dataset. Historical snapshots are available per day.",
          },
        },
        {
          "@type": "Question",
          name: "What GPU types are available for comparison?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We track H100, H200, A100, A10, L40S, B200, RTX 4090, and more across neo cloud providers. Use the GPU Type filter to narrow down specific models.",
          },
        },
        {
          "@type": "Question",
          name: "Can I download the GPU pricing data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes. The full dataset is freely available as JSON at ${dataUrl} and as CSV. Historical daily snapshots are available at ${siteUrl}/history/YYYY-MM-DD/all.json.`,
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Dashboard />
    </>
  );
}
