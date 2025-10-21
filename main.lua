local M = {}

function M:peek(job)
  ya.notify { title = "Mermaid Plugin", content = "Plugin called! File: " .. tostring(job.file.url), timeout = 5, level = "warn" }

  local cache = ya.file_cache(job)
  if not cache then
    ya.notify { title = "Mermaid Error", content = "No cache available", timeout = 5, level = "error" }
    return
  end

  -- Add .png extension to cache path
  local cache_png = tostring(cache) .. ".png"

  -- Convert character cells to pixels
  -- Use same multiplier for both to preserve aspect ratio of preview area
  -- Respect yazi's max_width and max_height limits (default: 1920x1080)
  local pixel_per_cell = 20
  local max_width = 1920
  local max_height = 1080

  local width = math.min(math.max(job.area.w * pixel_per_cell, 800), max_width)
  local height = math.min(math.max(job.area.h * pixel_per_cell, 600), max_height)

  -- Debug: Show dimensions and area position
  ya.notify {
    title = "Mermaid Debug",
    content = string.format("area: x=%d y=%d w=%d h=%d | img: %dx%d",
      job.area.x, job.area.y, job.area.w, job.area.h, width, height),
    timeout = 5,
    level = "info"
  }

  local child, err = Command("mmdc")
      :arg("-i"):arg(tostring(job.file.url))
      :arg("-o"):arg(cache_png)
      :arg("-e"):arg("png")
      :arg("-w"):arg(tostring(width))
      :arg("-H"):arg(tostring(height))
      :stdout(Command.PIPED)
      :stderr(Command.PIPED)
      :spawn()

  if not child then
    ya.notify { title = "Mermaid Error", content = "Failed to spawn mmdc: " .. tostring(err), timeout = 5, level = "error" }
    return
  end

  local output = child:wait_with_output()

  if not output then
    ya.notify { title = "Mermaid Error", content = "No output from mmdc", timeout = 5, level = "error" }
    return
  end

  if output.status and output.status.success then
    ya.notify { title = "Mermaid Success", content = "Rendering: " .. cache_png, timeout = 3, level = "info" }
    ya.image_show(Url(cache_png), job.area)
    ya.preview_widgets(job, {})
  else
    local stderr = output.stderr or ""
    ya.notify { title = "Mermaid Error", content = "mmdc failed: " .. stderr, timeout = 5, level = "error" }
  end
end

function M:seek() end

return M
