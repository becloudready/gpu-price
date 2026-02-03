
# GPU Price

**CloudDealHunt** is a tool designed to help developers find the best prices for various cloud resources such as GPUs, CPUs, AI tokens, and other services across multiple cloud providers. Whether you're working with AI workloads, distributed systems, or general compute needs, CloudPriceFinder ensures you get the best price for the resources you need.

## Features

- **Multi-Cloud Support**: Fetch and compare pricing from popular cloud providers like AWS, Azure, Google Cloud, and more.
- **Resource Comparison**: Compare prices for GPU models (e.g., A100, H100), CPU types, AI tokens, and other cloud services.
- **Real-Time Pricing**: Get the latest pricing for on-demand, spot, and reserved instances.
- **Developer-Focused**: Tailored for developers who need to optimize cloud infrastructure costs for AI, machine learning, and compute-intensive applications.
- **Custom Filters**: Filter results by resource type, region, pricing model, and more to find the best deals that fit your needs.

## Supported Resources

- **GPU**: A100, H100, MI300, and more.
- **CPU**: General-purpose, compute-optimized, memory-optimized CPUs from various cloud providers.
- **AI Tokens**: Fetch pricing for AI token services like OpenAI, Hugging Face, etc.
- **Other Cloud Services**: Storage, networking, and other cloud infrastructure services.

## Getting Started

### Prerequisites

Make sure you have the following installed:
- Python 3.8 or higher
- `gpuhunt` library for fetching GPU prices
- Any additional dependencies listed in `requirements.txt`

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/beCloudReady/CloudDealHunt.git
   cd CloudDealHunt
   ```

2. Install the required dependencies:

   ```bash
   pip install -r requirements.txt
   ```

### Usage

1. Run the Python script to fetch and display cloud resource prices:

   ```bash
   python fetch_prices.py
   ```

2. Use filters to customize the results for your specific needs (e.g., by region, resource type, or pricing model).

3. View the results in a JSON or table format, and export them for further analysis.



## Roadmap

- [ ] Support for additional cloud providers.
- [ ] Expand pricing for AI token services.
- [ ] Introduce cost prediction based on historical data.
- [ ] Add integration with cloud cost management tools.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have suggestions or improvements.

1. Fork the repository.
2. Create a new branch: `git checkout -b my-feature`.
3. Make your changes and commit them: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin my-feature`.
5. Submit a pull request.

## License

This project is licensed under the Apache License

