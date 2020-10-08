/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console, document, window, Event */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import { toWidget } from '@ckeditor/ckeditor5-widget/src/utils';

import ClickObserver from '@ckeditor/ckeditor5-engine/src/view/observer/clickobserver';
import CompositionObserver from '@ckeditor/ckeditor5-engine/src/view/observer/compositionobserver';
import FocusObserver from '@ckeditor/ckeditor5-engine/src/view/observer/focusobserver';
import InputObserver from '@ckeditor/ckeditor5-engine/src/view/observer/inputobserver';
import KeyObserver from '@ckeditor/ckeditor5-engine/src/view/observer/keyobserver';
import MouseEventsObserver from '@ckeditor/ckeditor5-table/src/tablemouse/mouseeventsobserver';
import MouseObserver from '@ckeditor/ckeditor5-engine/src/view/observer/mouseobserver';

class SimpleWidgetEditing extends Plugin {
	static get requires() {
		return [ Widget ];
	}

	init() {
		this._defineSchema();
		this._defineConverters();
		this._addObservers();
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register( 'simpleWidgetElement', {
			isObject: true,
			allowWhere: '$block'
		} );
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'simpleWidgetElement',
			view: ( modelElement, { writer } ) => {
				const widgetElement = createView( modelElement, { writer } );

				return toWidget( widgetElement, writer );
			}
		} );

		conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'simpleWidgetElement',
			view: createView
		} );

		conversion.for( 'upcast' ).elementToElement( {
			model: 'simpleWidgetElement',
			view: {
				name: 'section',
				classes: 'simple-widget-container'
			}
		} );

		function createView( modelElement, { writer } ) {
			const simpleWidgetContainer = writer.createContainerElement( 'section', { class: 'simple-widget-container' } );
			const simpleWidgetElement = writer.createRawElement( 'div', { class: 'simple-widget-element' }, domElement => {
				domElement.innerHTML = `
					<fieldset data-cke-ignore-events="true">
						<legend>Ignored container with <strong>data-cke-ignore-events="true"</strong></legend>
						<input>
						<button>Click!</button>
					</fieldset>
					<fieldset>
						<legend>Regular container</legend>
						<input>
						<button>Click!</button>
					</fieldset>
				`;
			} );

			writer.insert( writer.createPositionAt( simpleWidgetContainer, 0 ), simpleWidgetElement );

			return simpleWidgetContainer;
		}
	}

	_addObservers() {
		const view = this.editor.editing.view;

		const observers = new Map( [
			[ ClickObserver, [ 'click' ] ],
			[ CompositionObserver, [ 'compositionstart', 'compositionupdate', 'compositionend' ] ],
			[ FocusObserver, [ 'focus', 'blur' ] ],
			[ InputObserver, [ 'beforeinput' ] ],
			[ KeyObserver, [ 'keydown', 'keyup' ] ],
			[ MouseEventsObserver, [ 'mousemove', 'mouseup', 'mouseleave' ] ],
			[ MouseObserver, [ 'mousedown' ] ]
		] );

		observers.forEach( ( events, observer ) => {
			view.addObserver( observer );

			events.forEach( eventName => {
				this.listenTo( view.document, eventName, () => {
					console.log( `Received ${ eventName } event.` );
				} );
			} );
		} );
	}
}

class SimpleWidgetUI extends Plugin {}

class SimpleWidget extends Plugin {
	static get requires() {
		return [ SimpleWidgetEditing, SimpleWidgetUI ];
	}
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Essentials, SimpleWidget ]
	} )
	.then( editor => {
		window.editor = editor;

		addListenerForCustomEvent( editor, 'CUSTOM_EVENT' );
		addEmmitersForCustomEvent( editor, 'CUSTOM_EVENT' );
	} )
	.catch( error => {
		console.error( error.stack );
	} );

function addListenerForCustomEvent( editor, eventName ) {
	const view = editor.editing.view;

	view.document.on( eventName, () => {
		console.log( `Received ${ eventName } event.` );
	} );
}

function addEmmitersForCustomEvent( editor, eventName ) {
	const view = editor.editing.view;
	const container = Array
		.from( view.document.getRoot().getChildren() )
		.find( element => element.hasClass( 'simple-widget-container' ) );

	view.domConverter
		.viewToDom( container )
		.querySelectorAll( 'button' )
		.forEach( button => {
			button.addEventListener( 'click', () => {
				button.dispatchEvent( new Event( eventName ), { bubbles: true } );
				console.log( `Dispatched ${ eventName } event.` );
			} );
		} );
}
