import { extractJson } from "./extract-json";

let hbs = `{{#>Partials/layout}}

  {{> header}}

  {{title}}
  {{author.name}}

  {{#each reviewers}}				1
	  {{firstName}}
	  {{lastName}}
	  {{email}}

	  {{#each deepArray}}			2
			{{ banana }}
	  {{/each}}

	  {{ orange }}
  {{/each}}

  {{signature}}
  
  {{#each otherthings}}				3
	  {{firstName}}
  {{/each}}

{{/Partials/layout}}`;

interface Scope {
	type: 'root' | 'subscope'
	childScopes: ArrayScope[];
}

class ArrayScope implements Scope {
	type: 'root' | 'subscope' = 'subscope';
	protected body = '';
	childScopes: ArrayScope[] = [];
	

	constructor(readonly identifier?: string) {
		this.scanScope();
	}

	private scanScope() {
		let nextStop: RegExpExecArray | null;

		while ((nextStop = /{{(#|\/)each( \w+)?.*}}/.exec(hbs)) !== null) {
			//const [ _, controlChar, arrayName ] = nextStop;

			if (nextStop[1] === '#') {
				// New scope
				this.body = this.body + hbs.substring(0, nextStop.index);
				hbs = hbs.slice(nextStop.index + 1);
				const nameOfNewChildScope = nextStop[2].trim();
				this.childScopes.push(new ArrayScope(nameOfNewChildScope));
			} else {
				// Close the scope
				this.body = this.body + hbs.substring(0, nextStop.index);
				hbs = hbs.slice(nextStop.index + 1);
				break;
			}
		}

		if (this.type === 'root') {
			this.body = this.body + hbs;
		}
	}

	getExpressions(): Object {
		return extractJson(this.body);
	}
}

class RootScope extends ArrayScope implements Scope {
	type: 'root' | 'subscope' = 'root';

	private getChildExpressions(scope: Scope) {
		const childArrays = {};

		for (const childScope of scope.childScopes) {
			childArrays[childScope.identifier!] = [{
				...childScope.getExpressions(),
				...this.getChildExpressions(childScope)
			}]
		}

		return childArrays;
	}

	getExpressions(): Object {
		const expressions = {
			...extractJson(this.body),
			...this.getChildExpressions(this)
		};

		return expressions;
	}
}

const root = new RootScope();

console.log(JSON.stringify(root.getExpressions(), null, 2));




// Fortsätt traversera.
// Om vi hittar en #each, öka på stacken
// Om vi hittar en /each, avsluta scopet