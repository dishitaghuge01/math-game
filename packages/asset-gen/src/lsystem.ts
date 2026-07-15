export class LSystem {
  axiom: string;
  rules: Map<string, string>;

  constructor(axiom: string, rules: Map<string, string>) {
    this.axiom = axiom;
    this.rules = rules;
  }

  generate(iterations: number): string {
    let current = this.axiom;
    for (let i = 0; i < iterations; i += 1) {
      current = Array.from(current).map((symbol) => this.rules.get(symbol) ?? symbol).join('');
    }
    return current;
  }
}
