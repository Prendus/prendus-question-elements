# Prendus Question Elements

[![CircleCI](https://circleci.com/gh/Prendus/prendus-question-elements.svg?style=shield)](https://circleci.com/gh/Prendus/prendus-question-elements) [![npm version](https://img.shields.io/npm/v/prendus-question-elements.svg?style=flat)](https://www.npmjs.com/package/prendus-question-elements) [![dependency Status](https://david-dm.org/prendus/prendus-question-elements/status.svg)](https://david-dm.org/prendus/prendus-question-elements) [![devDependency Status](https://david-dm.org/prendus/prendus-question-elements/dev-status.svg)](https://david-dm.org/prendus/prendus-question-elements?type=dev) [![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/prendus/prendus-question-elements)

![Question demo](https://github.com/prendus/prendus-question-elements/raw/master/readme-demo.gif)

Fully embeddable custom HTML elements for questions made with [AssessML](https://github.com/Prendus/assessml). Use these elements in any web platform project, including [Web Components](https://www.webcomponents.org/), [Polymer](https://www.polymer-project.org/), [SkateJS](https://github.com/skatejs/skatejs), [React](https://facebook.github.io/react/), [Vue.js](https://vuejs.org/), [Angular](https://angular.io/), [Ember.js](https://www.emberjs.com/), and Vanilla.

## Demo

* [Click to see a live question editor](https://prendus.com/question/cj4yhatlcphu20137xdwhb3pu/demo)
* [Click to see a live question](https://prendus.com/question/cj4yhatlcphu20137xdwhb3pu/view)
* [Click to see many more examples](https://prendus.com/question/examples)

## Installation

To use in your own project:

```bash
npm install prendus-question-elements

# Eventually the bower commands below will disappear, but until we can fully support npm, sorry

bower install polymer --save
bower install paper-tabs --save
bower install iron-pages --save
bower install juicy-ace-editor --save
bower install wysiwyg-e --save
bower install paper-toast --save
```

To work on locally:

```bash
git clone https://github.com/Prendus/prendus-question-elements
cd prendus-question-elements
npm install
npm run test-window
```

## Use

The elements are written in TypeScript, and there is no build process. You will have to implement your own build process to consume them. We use [Zwitterion](https://github.com/lastmjs/zwitterion).

Import the Web Components polyfill for cross-browser compatibility:

```HTML
...
<head>
  <script src="[path to bower_components]/webcomponentsjs/webcomponents-lite.js"></script>
</head>
...
```

Import the element that you would like to use:

```HTML
<link rel="import" href="[path to node_modules]/prendus-question-elements/prendus-view-question.html">
<link rel="import" href="[path to node_modules]/prendus-question-elements/prendus-edit-question.html">
```

Then use the element wherever you would like:

```HTML
<prendus-view-question question-id="cj4os7mld6kq4017073x00cjt"></prendus-view-question>
<prendus-edit-question question-id="cj4os7mld6kq4017073x00cjt"></prendus-edit-question>
```

## API

### prendus-view-question

#### Properties

```typescript
questionId: string
```

The Prendus question ID for this question. Providing this property will automatically load the question from the Prendus database.

```typescript
question: Question
```

A question object can be used to provide the text and code of a question directly instead of loading it from the Prendus database. Any Question passed in must have the following interface:

```typescript
interface Question {
  readonly text: string;
  readonly code: string;
}
```

### prendus-edit-question

#### Properties

```typescript
questionId: string
```

The Prendus question ID for this question. Providing this property will automatically load the question from the Prendus database.

```typescript
question: string
```

A question object can be used to provide the text and code of a question directly instead of loading it from the Prendus database. Any Question passed in must have the following interface:

```typescript
interface Question {
  text: string;
  code: string;
}
```

```typescript
user: User
```

A Prendus user. This user (along with the userToken) is necessary to enforce many of the permissions on the questions. Any user passed in must have the following interface:

```typescript
interface User {
  id: string;
}
```

```typescript
userToken: string
```

The [Graphcool](https://www.graph.cool/) JSON Web Token associated with a user. This token (along with the user) is necessary to enforce many of the permissions on the questions.

```typescript
noSave: boolean
```

Whether or not to execute API calls to save the question to the database on changes to the question text or code.
