import sys
import os
import threading
import time
import ctypes
import win32clipboard
import win32con
from PySide6 import QtCore, QtGui, QtWidgets
from PySide6.QtCore import Qt, Signal, QObject
from PySide6.QtGui import QColor, QPainter, QPixmap
import keyboard  # Ensure you have this installed

# Helper function to get selected text without permanently modifying the clipboard
def get_selected_text():
    """
    Retrieves the currently selected text in the active window without permanently altering the clipboard.
    """
    # Save the current clipboard content
    win32clipboard.OpenClipboard()
    try:
        if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
            original_data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
        else:
            original_data = ""
    except TypeError:
        original_data = ""
    win32clipboard.CloseClipboard()

    # Simulate Ctrl+C to copy selected text
    ctypes.windll.user32.keybd_event(0x11, 0, 0, 0)  # Ctrl down
    ctypes.windll.user32.keybd_event(0x43, 0, 0, 0)  # C down
    ctypes.windll.user32.keybd_event(0x43, 0, win32con.KEYEVENTF_KEYUP, 0)  # C up
    ctypes.windll.user32.keybd_event(0x11, 0, win32con.KEYEVENTF_KEYUP, 0)  # Ctrl up

    time.sleep(0.1)  # Slightly longer delay to ensure clipboard is updated

    # Get the copied text
    win32clipboard.OpenClipboard()
    try:
        if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
            copied_data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
        else:
            copied_data = ""
    except TypeError:
        copied_data = ""
    win32clipboard.CloseClipboard()

    # Restore the original clipboard content
    win32clipboard.OpenClipboard()
    win32clipboard.EmptyClipboard()
    if original_data:
        win32clipboard.SetClipboardText(original_data, win32con.CF_UNICODETEXT)
    win32clipboard.CloseClipboard()

    return copied_data

# Custom signal emitter for hotkey
class HotkeyListener(QObject):
    hotkey_pressed = Signal()

    def __init__(self):
        super().__init__()

    def start_listening(self):
        keyboard.add_hotkey('ctrl+space', self.emit_signal)
        keyboard.wait()  # This will block, so run in a separate thread

    def emit_signal(self):
        self.hotkey_pressed.emit()

class AIAssistantWindow(QtWidgets.QWidget):
    def __init__(self, icon_cache):
        super().__init__()
        self.icon_cache = icon_cache  # Dictionary of preloaded QIcons
        self.setWindowTitle('AI Assistant')
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)

        # Set fixed window size
        self.setFixedSize(350, 450)  # Increased width and height to accommodate buttons

        # Main layout
        self.main_layout = QtWidgets.QVBoxLayout(self)
        self.main_layout.setContentsMargins(20, 20, 20, 20)
        self.main_layout.setSpacing(15)  # Increased spacing for better separation

        # Top Part: "Describe your change" button
        self.create_top_part()

        # Middle Part: Two buttons "Proofread" and "Rewrite"
        self.create_middle_part()

        # Separator
        separator = QtWidgets.QFrame()
        separator.setFrameShape(QtWidgets.QFrame.HLine)
        separator.setFrameShadow(QtWidgets.QFrame.Sunken)
        self.main_layout.addWidget(separator)

        # Bottom Part: A list of action buttons
        self.create_bottom_part()

    def create_button(self, text, icon_name, icon_size=(20, 20), bottom=False):
        """Helper function to create a button with an icon."""
        button = QtWidgets.QPushButton(text)
        button.setCursor(Qt.PointingHandCursor)
        if bottom:
            # Style for bottom buttons: transparent background and slimmer
            button.setStyleSheet("""
                QPushButton {
                    background-color: transparent;
                    color: #333;
                    border: none;
                    padding: 6px 12px;
                    text-align: left;
                    font-size: 14px;
                }
                QPushButton:hover {
                    background-color: rgba(0, 0, 0, 20);
                }
            """)
            button.setFixedHeight(35)
        else:
            # Style for other buttons
            button.setStyleSheet("""
                QPushButton {
                    background-color: rgba(255, 255, 255, 200);
                    color: #333;
                    border-radius: 10px;
                    padding: 10px;
                    text-align: left;
                    font-size: 16px;
                }
                QPushButton:hover {
                    background-color: rgba(0, 0, 0, 20);
                }
            """)
            button.setFixedHeight(50)
        icon = self.icon_cache.get(icon_name, None)
        if icon:
            button.setIcon(icon)
            button.setIconSize(QtCore.QSize(*icon_size))
        return button

    def create_top_part(self):
        top_frame = QtWidgets.QHBoxLayout()
        top_frame.setSpacing(10)

        # "Describe your change" button (full width top bar shaped)
        describe_button = self.create_button("Describe your change", 'describe.png')
        # Stretch to make it occupy full width
        top_frame.addWidget(describe_button)

        self.main_layout.addLayout(top_frame)

    def create_middle_part(self):
        middle_frame = QtWidgets.QHBoxLayout()
        middle_frame.setSpacing(15)

        # Proofread button
        proofread_button = self.create_button("Proofread", 'proofread.png')
        middle_frame.addWidget(proofread_button)

        # Rewrite button
        rewrite_button = self.create_button("Rewrite", 'rewrite.png')
        middle_frame.addWidget(rewrite_button)

        self.main_layout.addLayout(middle_frame)

    def create_bottom_part(self):
        # Define a list of tuples containing button text and icon names
        bottom_buttons = [
            ("Friendly", 'friendly.png'),
            ("Professional", 'professional.png'),
            ("Concise", 'concise.png'),
            ("Summary", 'summary.png'),
            ("Key Points", 'keypoints.png'),
            ("Table", 'table.png'),
            ("List", 'list.png')
        ]

        for text, icon_name in bottom_buttons:
            self.add_list_button(text, icon_name, bottom=True)

        self.main_layout.addStretch()  # Push buttons to the top

    def add_list_button(self, text, icon_name, bottom=False):
        """Helper function to add a button to the bottom list."""
        button = self.create_button(text, icon_name, bottom=bottom)
        self.main_layout.addWidget(button)

    def paintEvent(self, event):
        """Override the paint event to draw the translucent background."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        rounded_rect = QtCore.QRect(0, 0, self.width(), self.height())
        painter.setBrush(QColor(255, 255, 255, 220))  # More opaque white
        painter.setPen(QtCore.Qt.NoPen)
        painter.drawRoundedRect(rounded_rect, 15, 15)  # Rounded corners

    def focusOutEvent(self, event):
        """Hide the window when it loses focus."""
        self.hide()
        super().focusOutEvent(event)

class MainApplication(QtWidgets.QApplication):
    def __init__(self, sys_argv):
        super().__init__(sys_argv)
        self.setQuitOnLastWindowClosed(False)  # Ensure the app keeps running without visible windows

        # Preload all icons
        self.icon_cache = self.preload_icons()

        # Create the main window but keep it hidden initially
        self.window = AIAssistantWindow(self.icon_cache)

        # Setup System Tray
        self.tray_icon = QtWidgets.QSystemTrayIcon(self)
        tray_icon_path = os.path.join('icons', 'tray_icon.png')  # Ensure you have an icon
        if os.path.exists(tray_icon_path):
            self.tray_icon.setIcon(QtGui.QIcon(tray_icon_path))
        else:
            # Use a default icon if custom icon not found
            self.tray_icon.setIcon(self.style().standardIcon(QtWidgets.QStyle.SP_ComputerIcon))
        self.tray_icon.setVisible(True)

        # Add a context menu to the tray icon
        tray_menu = QtWidgets.QMenu()
        exit_action = tray_menu.addAction("Exit")
        exit_action.triggered.connect(self.exit_application)
        self.tray_icon.setContextMenu(tray_menu)

        # Setup Hotkey Listener
        self.hotkey_listener = HotkeyListener()
        self.hotkey_listener.hotkey_pressed.connect(self.on_hotkey_pressed)
        self.listener_thread = threading.Thread(target=self.hotkey_listener.start_listening, daemon=True)
        self.listener_thread.start()

    def preload_icons(self):
        """Preload all icons to optimize performance."""
        icons = ['describe.png', 'proofread.png', 'rewrite.png', 'friendly.png',
                 'professional.png', 'concise.png', 'summary.png', 'keypoints.png',
                 'table.png', 'list.png', 'tray_icon.png']
        icon_cache = {}
        icons_path = os.path.join(os.getcwd(), 'icons')
        for icon_name in icons:
            icon_path = os.path.join(icons_path, icon_name)
            if os.path.exists(icon_path):
                icon_cache[icon_name] = QtGui.QIcon(icon_path)
            else:
                # Use a default icon if custom icon not found
                icon_cache[icon_name] = self.style().standardIcon(QtWidgets.QStyle.SP_FileIcon)
        return icon_cache

    def on_hotkey_pressed(self):
        # Retrieve selected text without modifying the clipboard
        selected_text = get_selected_text()
        if selected_text.strip():
            # Optionally, you can pass the selected_text to the window
            # For example, display it or process it
            print(f"Selected Text: {selected_text}")  # For debugging

            # Show the window at the cursor position
            cursor_pos = QtGui.QCursor.pos()
            # Adjust position to prevent window from going off-screen
            screen_geometry = self.primaryScreen().availableGeometry()
            window_width = self.window.width()
            window_height = self.window.height()
            x = min(cursor_pos.x(), screen_geometry.width() - window_width)
            y = min(cursor_pos.y(), screen_geometry.height() - window_height)
            self.window.move(x, y)

            self.window.show()
            self.window.raise_()
            self.window.activateWindow()
            self.window.setFocus()
        else:
            # No text selected; do not show the window
            pass

    def exit_application(self):
        self.tray_icon.hide()
        QtCore.QCoreApplication.exit()

def main():
    app = MainApplication(sys.argv)
    sys.exit(app.exec())

if __name__ == '__main__':
    main()
