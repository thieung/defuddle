import { DOMParser, parseHTML } from 'linkedom';

// Provide browser-like globals for defuddle in Cloudflare Workers
const g = globalThis as any;
if (!g.DOMParser) {
	g.DOMParser = DOMParser;
}
if (!g.window) {
	g.window = g;
}
if (!g.document) {
	const { document } = parseHTML('');
	g.document = document;
}
if (!g.Node) {
	g.Node = {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
	};
}
if (!g.getComputedStyle) {
	g.getComputedStyle = () => ({ display: '' });
}
