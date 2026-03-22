local M = {}

function M:peek(job)
  local cache = ya.file_cache(job)
  if not cache then
    return
  end

  local cache_txt = tostring(cache) .. "_" .. tostring(job.area.w) .. "x" .. tostring(job.area.h) .. ".txt"
  local source_path = tostring(job.file.url)

  -- Check if cache exists and is newer than source
  local source_cha = fs.cha(Url(source_path))
  local cache_cha = fs.cha(Url(cache_txt))

  if not cache_cha or not source_cha or cache_cha.mtime < source_cha.mtime then
    local child, err = Command("bun")
        :arg("/Users/naokiiida/.config/yazi/plugins/mermaid.yazi/render-mermaid.ts")
        :arg("--input"):arg(source_path)
        :arg("--width"):arg(tostring(job.area.w))
        :arg("--height"):arg(tostring(job.area.h))
        :stdout(Command.PIPED)
        :stderr(Command.PIPED)
        :spawn()

    if not child then
      ya.notify { title = "Mermaid Error", content = "Failed to spawn bun: " .. tostring(err), timeout = 5, level = "error" }
      return
    end

    local output = child:wait_with_output()

    if not output or not output.status or not output.status.success then
      local stderr = output and output.stderr or "unknown error"
      ya.notify { title = "Mermaid Error", content = "Render failed: " .. stderr, timeout = 5, level = "error" }
      return
    end

    -- Write ASCII output to cache file
    local f = io.open(cache_txt, "w")
    if not f then
      ya.notify { title = "Mermaid Error", content = "Failed to write cache", timeout = 5, level = "error" }
      return
    end
    f:write(output.stdout or "")
    f:close()
  end

  -- Read cached ASCII content
  local f = io.open(cache_txt, "r")
  if not f then
    return
  end
  local content = f:read("*a")
  f:close()

  -- Apply scroll offset (job.skip lines)
  local lines = {}
  for line in content:gmatch("[^\n]*") do
    lines[#lines + 1] = line
  end

  local skip = job.skip or 0
  local visible = {}
  for i = skip + 1, #lines do
    visible[#visible + 1] = lines[i]
  end

  local text = table.concat(visible, "\n")
  ya.preview_widget(job, ui.Text(text):area(job.area))
end

function M:seek(job)
  local step = job.units > 0 and 1 or -1
  ya.emit("peek", { math.max(0, cx.active.preview.skip + step), only_if = job.file.url })
end

return M
