# Prendus Question Elements

Fully embeddable custom HTML elements for questions made with [AssessML](https://github.com/Prendus/assessml). Use these elements in any web platform project [Web Components](https://www.webcomponents.org/), [Polymer](https://www.polymer-project.org/), [SkateJS](https://github.com/skatejs/skatejs), [React](https://facebook.github.io/react/), (Vue)[https://vuejs.org/], [Angular](https://angular.io/), [Ember](https://www.emberjs.com/), Vanilla).

## Installation

To use in your own project:

```bash
npm install prendus-question-elements
bower install polymer --save
bower install paper-tabs --save
```

To work on locally:

```bash
git clone https://github.com/Prendus/prendus-question-elements
cd prendus-question-elements
bower install
npm install
npm link
npm run test
```

## Use

Make sure to explain how to use the TypeScript types

First import the polyfill for HTML Web Components inside of the `<head></head>` element or anywhere in the `<body></body>` element before you place any of the Prendus custom elements (eventually this will not be necessary, but it is necessary now to support non-compliant browsers):

In the `<head></head>`:
```HTML
...
<head>
  <script src="node_modules/@npm-polymer/webcomponentsjs/webcomponents-lite.js"></script>
</head>
...
```

In the `<body></body>`:

```HTML
<body>
  <script src="node_modules/@npm-polymer/webcomponentsjs/webcomponents-lite.js"></script>
</body>
```

Now import the custom element you would like to use, either inside of the `<head></head>` element or anywhere in the `<body></body>` element before you place the custom element:

In the `<head></head>`:
```HTML
...
<head>
  <script src="node_modules/prendus-question-elements/prendus-view-question.html"></script>
</head>
...
```

In the `<body></body>`:

```HTML
<body>
  <script src="node_modules/prendus-question-elements/prendus-view-question.html"></script>
</body>
```

Then use the element wherever you would like:

```HTML
<prendus-view-question question-id="cj3ytnhdl7wz80112o9ebshi3"></prendus-view-question>
```
