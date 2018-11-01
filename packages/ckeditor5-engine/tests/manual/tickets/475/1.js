/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Range from '../../../../src/model/range';
import LivePosition from '../../../../src/model/liveposition';

import {
	upcastElementToAttribute
} from '../../../../src/conversion/upcast-converters';

import {
	downcastAttributeToElement,
} from '../../../../src/conversion/downcast-converters';

import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';

class Link extends Plugin {
	init() {
		const editor = this.editor;

		// Allow bold attribute on all inline nodes.
		editor.model.schema.extend( '$text', { allowAttributes: 'link' } );

		editor.conversion.for( 'downcast' ).add( downcastAttributeToElement( {
			model: 'link',
			view: ( modelAttributeValue, viewWriter ) => {
				return viewWriter.createAttributeElement( 'a', { href: modelAttributeValue } );
			}
		} ) );

		editor.conversion.for( 'upcast' ).add( upcastElementToAttribute( {
			view: 'a',
			model: {
				key: 'link',
				value: viewElement => viewElement.getAttribute( 'href' )
			}
		} ) );
	}
}

class AutoLinker extends Plugin {
	init() {
		this.editor.model.document.on( 'change', () => {
			const changes = this.editor.model.document.differ.getChanges();

			for ( const entry of changes ) {
				if ( entry.type != 'insert' || entry.name != '$text' || !entry.position.parent ) {
					continue;
				}

				const parent = entry.position.parent;
				const text = Array.from( parent.getChildren() ).map( item => item.data ).join( '' );

				const regexp = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;
				let match;

				while ( ( match = regexp.exec( text ) ) !== null ) {
					const index = match.index;
					const url = match[ 0 ];
					const length = url.length;

					if ( entry.position.offset + entry.length == index + length ) {
						const livePos = LivePosition._createAt( parent, index );
						this.editor.model.enqueueChange( writer => {
							const urlRange = Range._createFromPositionAndShift( livePos, length );
							writer.setAttribute( 'link', url, urlRange );
						} );
						return;
					}
				}
			}
		} );
	}
}

ClassicEditor.create( document.querySelector( '#editor' ), {
	plugins: [ Enter, Typing, Paragraph, Undo, Link, AutoLinker ],
	toolbar: [ 'undo', 'redo' ]
} );
