use std::env;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("Usage: {} <filename-or-path>", args[0]);
        process::exit(2);
    }

    let input = &args[1];

    if input.ends_with(".sh") {
        process::exit(0);
    } else {
        eprintln!("Error: input must end with .sh");
        process::exit(1);
    }
}