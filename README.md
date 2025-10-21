# mermaid.yazi

A [Yazi](https://github.com/sxyazi/yazi) plugin to preview Mermaid diagram files (`.mermaid`, `.mmd`) as rendered images in the preview pane.

## Dependencies

Make sure [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) is installed and in your `PATH`.

**Install via npm:**
```sh
npm install -g @mermaid-js/mermaid-cli
```

**Or via pnpm:**
```sh
pnpm add -g @mermaid-js/mermaid-cli
```

## Installation

### Using `ya pkg`
```sh
ya pkg add naokiiida/mermaid
```

### Manual

**Linux/macOS**
```sh
git clone https://github.com/naokiiida/mermaid.yazi.git ~/.config/yazi/plugins/mermaid.yazi
```

**Windows**
```sh
git clone https://github.com/naokiiida/mermaid.yazi.git %AppData%\yazi\config\plugins\mermaid.yazi
```

## Configuration

Add this to your `yazi.toml` file to enable Mermaid diagram previews:

```toml
[[plugin.prepend_previewers]]
name = "*.mermaid"
run = "mermaid"

[[plugin.prepend_previewers]]
name = "*.mmd"
run = "mermaid"
```

## Usage

Once configured, navigate to any `.mermaid` or `.mmd` file in Yazi, and the preview pane will automatically render the diagram as an image.

## How it works

The plugin uses the `mmdc` (mermaid-cli) command to convert Mermaid diagrams into PNG images. The rendered images are cached and displayed in the preview pane, with dimensions automatically adjusted based on the available preview area.

## License

This plugin is MIT-licensed. For more information, check the [LICENSE](LICENSE) file.
