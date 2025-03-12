# Arakne OSINT

Arakne is an AI-assisted OSINT (Open Source Intelligence) tool that extracts named entities from text and visualizes their relationships as an interactive graph network.

## Features

- **Text Analysis**: Extract named entities (people, organizations, locations, etc.) from any text
- **Relationship Mapping**: Automatically identify and visualize connections between entities
- **Interactive Graph**: Explore entity relationships through an interactive network graph
- **Entity Management**: Edit, merge, or delete extracted entities to refine analysis [WIP]
- **Export Capabilities**: Save analysis results in various formats (JSON, CSV, PNG) [WIP]

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: Shadcn UI, Tailwind CSS
- **NLP Processing**: Compromise NLP, Natural
- **Visualization**: Vis Network, React Force Graph, D3

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Enter or paste text containing entities (news articles, reports, documents, etc.)
2. The system will automatically extract named entities and their relationships
3. Explore the resulting network graph to discover connections
4. Refine the analysis by adding, editing, or removing entities
5. Export your findings in your preferred format

## License

MIT
