#pragma once

#include <iostream>
#include <WinSock2.h>
#include <mutex>
#include <queue>
#include <string>
#include <memory>

namespace IocpGameServer {
	typedef unsigned long long uid_t;
	class Application;
	class Socket;

	class User {
		Application& app_;
		std::weak_ptr<Socket> socket_;
		const uid_t user_id_;
		const std::string user_name_;
		mutable std::mutex send_lock_;
		bool handler_end_ = false;
		User(const User&) = delete;
		const User operator=(const User&) = delete;
		bool force_disconnected_ = false;
		explicit User(std::shared_ptr<Socket> socket, Application& app, const uid_t user_id, const std::string& user_name) : socket_(socket), app_(app), user_id_(user_id), user_name_(user_name) {}
	public:
		static const bool CreateUser(std::shared_ptr<Socket> socket, std::string data);
		~User() { std::cout << "user dtor called" << std::endl; }
		void Init();
		void PrintUserInfo() { std::cout << "user ID: " << user_id_ << std::endl; }
		const std::string& GetName() const { return user_name_; }
		const uid_t GetUserID() const { return user_id_; }
		Application& GetApp() const { return app_; }
		void ForceDisconnect();
		const bool ForceDisconnected() const { return force_disconnected_; }

		void Send(const unsigned int protocol, const std::string& data);
		void Send(const unsigned int protocol);

		//friend bool Socket::CreateUser(std::shared_ptr<Application>, std::string);
	};

} //namespace IocpGameServer